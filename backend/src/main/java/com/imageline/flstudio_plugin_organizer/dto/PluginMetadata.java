package com.imageline.flstudio_plugin_organizer.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PluginMetadata {

    private String type;
    private List<String> pluginNames;
}
