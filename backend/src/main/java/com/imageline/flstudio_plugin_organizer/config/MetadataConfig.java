package com.imageline.flstudio_plugin_organizer.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.imageline.flstudio_plugin_organizer.dto.PluginMetadata;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Configuration
@Getter
@RequiredArgsConstructor
public class MetadataConfig {

    private List<PluginMetadata> pluginsMetadata;
    private final ObjectMapper objectMapper;

    public void loadPluginsMetadata(Path pluginMetadataPath) throws IOException {
        String fileContent = Files.readString(pluginMetadataPath);

        TypeReference<List<PluginMetadata>> typeReference = new TypeReference<>() {};
        pluginsMetadata = objectMapper.readValue(fileContent, typeReference);
    }

    public String getPluginTypeFor(String pluginName) {
        if (pluginsMetadata == null) {
            return null;
        }

        return pluginsMetadata.stream()
                .filter(pluginMetadata -> pluginMetadata.getPluginNames().contains(pluginName))
                .findAny()
                .map(PluginMetadata::getType)
                .orElse(null);
    }
}
