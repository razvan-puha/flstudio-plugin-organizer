package com.imageline.flstudio_plugin_organizer.util;

import java.util.List;

import org.springframework.util.StringUtils;

import com.imageline.flstudio_plugin_organizer.dto.TreeItem;

public class TreeUtils {
    private static final String PATH_SEPARATOR = "/";

    private TreeUtils() {
    }

    public static String getPathForPlugin(List<TreeItem> treeItems, String pluginName) {
        for (TreeItem treeItem : treeItems) {
            String path = findPathRecursively(treeItem, pluginName);
            if (path != null) {
                return path;
            }
        }
        return null;
    }

    private static String findPathRecursively(TreeItem item, String targetLabel) {
        if (item.getLabel().equals(targetLabel)) {
            return "";
        }

        if (item.getChildren() != null) {
            for (TreeItem child : item.getChildren()) {
                String childPath = findPathRecursively(child, targetLabel);
                if (childPath != null) {
                    return StringUtils.hasText(childPath) ? item.getLabel() + PATH_SEPARATOR + childPath
                            : item.getLabel();
                }
            }
        }

        return null;
    }
}
