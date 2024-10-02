package com.imageline.flstudio_plugin_organizer.predicate;

import java.util.function.Predicate;

public class MatchExtensionPredicate implements Predicate<String> {

    private final String extension;

    public MatchExtensionPredicate(String extension) {
        if (!extension.startsWith(".")) {
            extension = "." + extension;
        }
        this.extension = extension.toLowerCase();
    }

    @Override
    public boolean test(String path) {
        if (path == null) {
            return false;
        }
        return path.endsWith(extension);
    }
}
