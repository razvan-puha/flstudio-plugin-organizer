package com.imageline.flstudio_plugin_organizer.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TreeItem {
    private String id;
    private String label;
    private String parentId;
    private String containerId;
    private List<TreeItem> children;
    private Boolean isExpanded;
    private String containerType;  // will be either "effects" or "generators"
    private String fileType;       // will be either "file", "folder", or "container"
} 