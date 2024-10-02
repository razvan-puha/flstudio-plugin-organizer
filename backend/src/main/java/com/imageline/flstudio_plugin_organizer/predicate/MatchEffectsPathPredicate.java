package com.imageline.flstudio_plugin_organizer.predicate;

import java.util.List;
import java.util.function.Predicate;

public class MatchEffectsPathPredicate implements Predicate<String> {

    private static final List<String> effectsPaths = List.of("Installed/Effects/New", "Effects/New");

    @Override
    public boolean test(String pathString) {
        for (String effectsPath : effectsPaths) {
            if (pathString.startsWith(effectsPath)) {
                return true;
            }
        }

        return false;
    }
}
