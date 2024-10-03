package com.imageline.flstudio_plugin_organizer.service;

import com.imageline.flstudio_plugin_organizer.config.MetadataConfig;
import com.imageline.flstudio_plugin_organizer.predicate.MatchEffectsPathPredicate;
import com.imageline.flstudio_plugin_organizer.predicate.MatchExtensionPredicate;
import com.imageline.flstudio_plugin_organizer.predicate.MatchGeneratorsPathPredicate;
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
import java.nio.file.Path;
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

    private final MetadataConfig metadataConfig;

    private Map<String, String> parseNfoContent(String nfoFileContent) {
        return nfoFileContent.lines()
                .map(line -> {
                        String[] split = line.split("=");
                        return Map.entry(split[0], split[1]);
                    })
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    public ResponseEntity<UrlResource> processZip(MultipartFile file) throws Exception {
        File fileToProcess = File.createTempFile("plugins", ".zip");
        try (FileOutputStream fileOutputStream = new FileOutputStream(fileToProcess)) {
            fileOutputStream.write(file.getBytes());
        }

        try (ZipFile zipFile = new ZipFile(fileToProcess)) {
            log.info("Processing zip file");
            log.debug("Zip file entries: {}", zipFile.stream().map(ZipEntry::getName).toList());
            File resultZip = processZip(zipFile);

            UrlResource urlResource = new UrlResource(resultZip.toURI());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, String.format("attachment; filename=\"%s\"", fileToProcess.getName()))
                    .body(urlResource);
        }
    }

    private File processZip(ZipFile zipFile) throws Exception {
        File startingDirectory = new File(System.getProperty("java.io.tmpdir"), String.format("%s/Organized", UUID.randomUUID()));

        MatchEffectsPathPredicate matchEffectsPathPredicate = new MatchEffectsPathPredicate();
        MatchGeneratorsPathPredicate matchGeneratorsPathPredicate = new MatchGeneratorsPathPredicate();
        MatchExtensionPredicate matchNfoPredicate = new MatchExtensionPredicate(NFO_EXTENSION);

        log.info("Processing effects");
        List<? extends ZipEntry> effectsNfoEntries = zipFile.stream()
                .filter(zipEntry -> matchEffectsPathPredicate.test(zipEntry.getName()))
                .filter(zipEntry -> matchNfoPredicate.test(zipEntry.getName()))
                .toList();

        for (ZipEntry nfoEntry : effectsNfoEntries) {
            processPlugin(zipFile, nfoEntry, new File(startingDirectory, "Effects"));
        }

        log.info("Processing generators");
        List<? extends ZipEntry> generatorsNfoEntries = zipFile.stream()
                .filter(zipEntry -> matchGeneratorsPathPredicate.test(zipEntry.getName()))
                .filter(zipEntry -> matchNfoPredicate.test(zipEntry.getName()))
                .toList();

        for (ZipEntry nfoEntry : generatorsNfoEntries) {
            processPlugin(zipFile, nfoEntry, new File(startingDirectory, "Generators"));
        }

        return ZipUtils.zipDirectory(startingDirectory);
    }

    private void processPlugin(ZipFile zipFile, ZipEntry nfoEntry, File outDirectory) throws IOException {
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
                moveThirdPartyPlugin(zipFile, nfoEntry, outDirectory, vendorName, nfoMetadata.get(PLUGIN_NAME_KEY));
                break;
        }
    }

    private String readFile(ZipFile zipFile, ZipEntry zipEntry) throws IOException {
        try (InputStream inputStream = zipFile.getInputStream(zipEntry)) {
            Scanner scanner = new Scanner(inputStream, StandardCharsets.UTF_8);
            StringBuilder stringBuilder = new StringBuilder();

            while (scanner.hasNextLine()) {
                stringBuilder.append(scanner.nextLine());
                stringBuilder.append(System.lineSeparator());
            }

            return stringBuilder.toString();
        }
    }

    private void moveThirdPartyPlugin(ZipFile zipFile, ZipEntry nfoEntry, File outDirectory, String vendorName, String pluginName) throws IOException {
        Path thirdPartyPluginsDirectory = Path.of(outDirectory.getAbsolutePath(), "User");
        if (!thirdPartyPluginsDirectory.toFile().exists()) {
            boolean dirCreated = thirdPartyPluginsDirectory.toFile().mkdirs();
            log.debug("Created directory {}: {}", thirdPartyPluginsDirectory, dirCreated);
        }

        Path vendorDirectory = Path.of(thirdPartyPluginsDirectory.toFile().getAbsolutePath(), vendorName);
        if (!vendorDirectory.toFile().exists()) {
            boolean dirCreated = vendorDirectory.toFile().mkdirs();
            log.debug("Created directory {}: {}", vendorDirectory, dirCreated);
        }

        log.info("Moving plugin {} to {}", pluginName, vendorDirectory);

        byte[] bytes = new byte[1024];
        int length;

        File fstFile, nfoFile;
        if (StringUtils.hasText(metadataConfig.getPluginTypeFor(pluginName))) {
            String pluginType = metadataConfig.getPluginTypeFor(pluginName);

            // create the plugin type directory first
            File pluginTypeDir = new File(vendorDirectory.toFile().getAbsolutePath(), pluginType);
            boolean pluginTypeDirCreated = pluginTypeDir.mkdirs();
            log.debug("Created directory {} under {}: {}", pluginType, vendorName, pluginTypeDirCreated);

            fstFile = new File(pluginTypeDir.getAbsolutePath(), String.format("%s%s", pluginName, PLUGIN_EXTENSION));
            nfoFile = new File(pluginTypeDir.getAbsolutePath(), String.format("%s%s", pluginName, NFO_EXTENSION));
        } else {
            fstFile = new File(vendorDirectory.toFile().getAbsolutePath(), String.format("%s%s", pluginName, PLUGIN_EXTENSION));
            nfoFile = new File(vendorDirectory.toFile().getAbsolutePath(), String.format("%s%s", pluginName, NFO_EXTENSION));
        }

        // move fst
        boolean fstFileCreated = fstFile.createNewFile();
        log.debug("Created file {}: {}", fstFile.getAbsolutePath(), fstFileCreated);

        try (
                FileOutputStream fos = new FileOutputStream(fstFile);
                InputStream inputStream = zipFile.getInputStream(zipFile.getEntry(nfoEntry.getName().replace(NFO_EXTENSION, PLUGIN_EXTENSION)))
        ) {
            while ((length = inputStream.read(bytes)) > 0) {
                fos.write(bytes, 0, length);
            }
        }

        // move nfo
        boolean nfoFileCreated = nfoFile.createNewFile();
        log.debug("Created file {}: {}", nfoFile.getAbsolutePath(), nfoFileCreated);

        try (
                FileOutputStream fos = new FileOutputStream(nfoFile);
                InputStream inputStream = zipFile.getInputStream(nfoEntry)
        ) {
            while ((length = inputStream.read(bytes)) > 0) {
                fos.write(bytes, 0, length);
            }
        }
    }
}
