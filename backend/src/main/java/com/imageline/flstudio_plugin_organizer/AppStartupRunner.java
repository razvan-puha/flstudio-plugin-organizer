package com.imageline.flstudio_plugin_organizer;

import com.imageline.flstudio_plugin_organizer.config.MetadataConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

@Component
@RequiredArgsConstructor
public class AppStartupRunner implements ApplicationRunner {

    @Value("classpath:metadata/plugins-metadata.json")
    private Resource pluginMetadataResource;

    private final MetadataConfig metadataConfig;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (pluginMetadataResource != null) {
            Path path = Paths.get(pluginMetadataResource.getURI());
            metadataConfig.loadPluginsMetadata(path);
        }
    }
}
