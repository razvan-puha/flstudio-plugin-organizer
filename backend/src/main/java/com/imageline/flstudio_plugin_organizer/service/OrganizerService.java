package com.imageline.flstudio_plugin_organizer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.imageline.flstudio_plugin_organizer.dto.PluginList;
import com.imageline.flstudio_plugin_organizer.dto.TreeItem;
import com.imageline.flstudio_plugin_organizer.predicate.MatchEffectsPathPredicate;
import com.imageline.flstudio_plugin_organizer.predicate.MatchExtensionPredicate;
import com.imageline.flstudio_plugin_organizer.predicate.MatchGeneratorsPathPredicate;
import com.imageline.flstudio_plugin_organizer.util.TreeUtils;
import com.imageline.flstudio_plugin_organizer.util.ZipUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrganizerService {

    private static final String FLSTUDIO_VENDOR_NAME = "Image-Line";
    private static final String APPLE_VENDOR_NAME = "Apple";
    private static final String PLUGIN_EXTENSION = ".fst";
    private static final String NFO_EXTENSION = ".nfo";

    private static final String VENDOR_NAME_KEY = "ps_file_vendorname_0";
    private static final String PLUGIN_NAME_KEY = "ps_name";

    private final ObjectMapper objectMapper;

    private Map<String, String> parseNfoContent(String nfoFileContent) {
        return nfoFileContent.lines()
                .map(line -> {
                    String[] split = line.split("=");
                    return Map.entry(split[0], split[1]);
                })
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    public ResponseEntity<UrlResource> processZip(MultipartFile file, String effectsStructureJson,
            String generatorsStructureJson) throws Exception {
        File fileToProcess = File.createTempFile("plugins", ".zip");
        try (FileOutputStream fileOutputStream = new FileOutputStream(fileToProcess)) {
            fileOutputStream.write(file.getBytes());
        }

        try (ZipFile zipFile = new ZipFile(fileToProcess)) {
            log.info("Processing zip file");
            log.debug("Zip file entries: {}", zipFile.stream().map(ZipEntry::getName).toList());
            File resultZip = processZip(zipFile, effectsStructureJson, generatorsStructureJson);

            UrlResource urlResource = new UrlResource(resultZip.toURI());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            String.format("attachment; filename=\"%s\"", fileToProcess.getName()))
                    .body(urlResource);
        }
    }

    private File processZip(ZipFile zipFile, String effectsStructureJson, String generatorsStructureJson)
            throws Exception {
        File startingDirectory = new File(System.getProperty("java.io.tmpdir"),
                String.format("%s/Organized", UUID.randomUUID()));

        MatchEffectsPathPredicate matchEffectsPathPredicate = new MatchEffectsPathPredicate();
        MatchGeneratorsPathPredicate matchGeneratorsPathPredicate = new MatchGeneratorsPathPredicate();
        MatchExtensionPredicate matchNfoPredicate = new MatchExtensionPredicate(NFO_EXTENSION);

        log.info("Processing effects");
        List<TreeItem> effectsStructure = objectMapper.readValue(effectsStructureJson,
                new TypeReference<List<TreeItem>>() {
                });
        List<? extends ZipEntry> effectsNfoEntries = zipFile.stream()
                .filter(zipEntry -> matchEffectsPathPredicate.test(zipEntry.getName()))
                .filter(zipEntry -> matchNfoPredicate.test(zipEntry.getName()))
                .toList();

        for (ZipEntry nfoEntry : effectsNfoEntries) {
            processPlugin(zipFile, nfoEntry, new File(startingDirectory, "Effects"), effectsStructure);
        }

        log.info("Processing generators");
        List<TreeItem> generatorsStructure = objectMapper.readValue(generatorsStructureJson,
                new TypeReference<List<TreeItem>>() {
                });
        List<? extends ZipEntry> generatorsNfoEntries = zipFile.stream()
                .filter(zipEntry -> matchGeneratorsPathPredicate.test(zipEntry.getName()))
                .filter(zipEntry -> matchNfoPredicate.test(zipEntry.getName()))
                .toList();

        for (ZipEntry nfoEntry : generatorsNfoEntries) {
            processPlugin(zipFile, nfoEntry, new File(startingDirectory, "Generators"), generatorsStructure);
        }

        return ZipUtils.zipDirectory(startingDirectory);
    }

    private void processPlugin(ZipFile zipFile, ZipEntry nfoEntry, File outDirectory, List<TreeItem> structure)
            throws IOException {
        if (!outDirectory.exists()) {
            boolean directoryCreated = outDirectory.mkdirs();
            log.debug("Created directory {}: {}", outDirectory.getAbsolutePath(), directoryCreated);
        }

        String nfoContent = readFile(zipFile, nfoEntry);

        Map<String, String> nfoMetadata = parseNfoContent(nfoContent);
        String vendorName = nfoMetadata.get(VENDOR_NAME_KEY);

        switch (vendorName) {
            case FLSTUDIO_VENDOR_NAME, APPLE_VENDOR_NAME:
                break;
            default:
                moveThirdPartyPlugin(zipFile, nfoEntry, outDirectory, nfoMetadata.get(PLUGIN_NAME_KEY),
                        structure);
                break;
        }
    }

    private String readFile(ZipFile zipFile, ZipEntry zipEntry) throws IOException {
        try (InputStream inputStream = zipFile.getInputStream(zipEntry)) {
            try (Scanner scanner = new Scanner(inputStream, StandardCharsets.UTF_8)) {
                StringBuilder stringBuilder = new StringBuilder();

                while (scanner.hasNextLine()) {
                    stringBuilder.append(scanner.nextLine());
                    stringBuilder.append(System.lineSeparator());
                }

                return stringBuilder.toString();
            }
        }
    }

    private void moveThirdPartyPlugin(ZipFile zipFile, ZipEntry nfoEntry, File outDirectory, String pluginName, List<TreeItem> structure) throws IOException {
        Path thirdPartyPluginsDirectory = Path.of(outDirectory.getAbsolutePath(), "User");
        log.debug("Third party plugins directory: {}", thirdPartyPluginsDirectory);


        if (!thirdPartyPluginsDirectory.toFile().exists()) {
            boolean dirCreated = thirdPartyPluginsDirectory.toFile().mkdirs();
            log.debug("Created directory {}: {}", thirdPartyPluginsDirectory, dirCreated);
        }       

        byte[] bytes = new byte[1024];
        int length;

        File fstFile;
        File nfoFile;

        String path = TreeUtils.getPathForPlugin(structure, pluginName);
        if (StringUtils.hasText(path)) {
            Path pathObject = thirdPartyPluginsDirectory.resolve(path);
            Files.createDirectories(pathObject);

            log.info("Moving plugin {} to {}", pluginName, pathObject);

            fstFile = pathObject.resolve(String.format("%s%s", pluginName, PLUGIN_EXTENSION)).toFile();
            nfoFile = pathObject.resolve(String.format("%s%s", pluginName, NFO_EXTENSION)).toFile();

            // move fst
            boolean fstFileCreated = fstFile.createNewFile();
            log.debug("Created file {}: {}", fstFile.getAbsolutePath(), fstFileCreated);

            try (
                    FileOutputStream fos = new FileOutputStream(fstFile);
                    InputStream inputStream = zipFile.getInputStream(
                            zipFile.getEntry(nfoEntry.getName().replace(NFO_EXTENSION, PLUGIN_EXTENSION)))) {
                while ((length = inputStream.read(bytes)) > 0) {
                    fos.write(bytes, 0, length);
                }
            }

            // move nfo
            boolean nfoFileCreated = nfoFile.createNewFile();
            log.debug("Created file {}: {}", nfoFile.getAbsolutePath(), nfoFileCreated);

            try (
                    FileOutputStream fos = new FileOutputStream(nfoFile);
                    InputStream inputStream = zipFile.getInputStream(nfoEntry)) {
                while ((length = inputStream.read(bytes)) > 0) {
                    fos.write(bytes, 0, length);
                }
            }
        }
    }

    public ResponseEntity<PluginList> loadZip(MultipartFile file) throws IOException {
        File fileToProcess = File.createTempFile("plugins", ".zip");
        try (FileOutputStream fileOutputStream = new FileOutputStream(fileToProcess)) {
            fileOutputStream.write(file.getBytes());
        }

        try (ZipFile zipFile = new ZipFile(fileToProcess)) {
            log.info("Processing zip file");
            log.debug("Zip file entries: {}", zipFile.stream().map(ZipEntry::getName).toList());
            PluginList pluginList = createPluginList(zipFile);

            return ResponseEntity.ok(pluginList);
        }
    }

    private PluginList createPluginList(ZipFile zipFile) throws IOException {
        PluginList pluginList = PluginList.builder()
                .effects(new HashMap<>())
                .generators(new HashMap<>())
                .build();

        MatchEffectsPathPredicate matchEffectsPathPredicate = new MatchEffectsPathPredicate();
        MatchGeneratorsPathPredicate matchGeneratorsPathPredicate = new MatchGeneratorsPathPredicate();
        MatchExtensionPredicate matchNfoPredicate = new MatchExtensionPredicate(NFO_EXTENSION);

        log.info("Processing effects");
        List<? extends ZipEntry> effectsNfoEntries = zipFile.stream()
                .filter(zipEntry -> matchEffectsPathPredicate.test(zipEntry.getName()))
                .filter(zipEntry -> matchNfoPredicate.test(zipEntry.getName()))
                .toList();

        for (ZipEntry nfoEntry : effectsNfoEntries) {
            createVendorPlugins(zipFile, nfoEntry, pluginList.getEffects());
        }

        log.info("Processing generators");
        List<? extends ZipEntry> generatorsNfoEntries = zipFile.stream()
                .filter(zipEntry -> matchGeneratorsPathPredicate.test(zipEntry.getName()))
                .filter(zipEntry -> matchNfoPredicate.test(zipEntry.getName()))
                .toList();

        for (ZipEntry nfoEntry : generatorsNfoEntries) {
            createVendorPlugins(zipFile, nfoEntry, pluginList.getGenerators());
        }

        return pluginList;
    }

    private void createVendorPlugins(ZipFile zipFile, ZipEntry nfoEntry, Map<String, List<String>> vendorPlugins)
            throws IOException {
        if (vendorPlugins == null) {
            log.error("Vendor plugins is null");
            return;
        }

        String nfoContent = readFile(zipFile, nfoEntry);

        Map<String, String> nfoMetadata = parseNfoContent(nfoContent);
        String vendorName = nfoMetadata.get(VENDOR_NAME_KEY);

        switch (vendorName) {
            case FLSTUDIO_VENDOR_NAME, APPLE_VENDOR_NAME:
                break;
            default:
                if (!vendorPlugins.containsKey(vendorName)) {
                    vendorPlugins.put(vendorName, new ArrayList<>());
                }

                vendorPlugins.get(vendorName).add(nfoMetadata.get(PLUGIN_NAME_KEY));
                break;
        }
    }
}
