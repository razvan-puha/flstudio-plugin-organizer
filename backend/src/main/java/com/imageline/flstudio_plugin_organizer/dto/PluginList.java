package com.imageline.flstudio_plugin_organizer.dto;

import java.util.List;
import java.util.Map;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PluginList {
    private Map<String, List<String>> effects;
    private Map<String, List<String>> generators;
} 