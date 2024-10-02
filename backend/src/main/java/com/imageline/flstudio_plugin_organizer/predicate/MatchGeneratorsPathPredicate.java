package com.imageline.flstudio_plugin_organizer.predicate;

import java.util.List;
import java.util.function.Predicate;

public class MatchGeneratorsPathPredicate implements Predicate<String> {
    private static final List<String> generatorsPaths = List.of("Installed/Generators/New", "Generators/New");

    @Override
    public boolean test(String pathString) {
        for (String generatorsPath : generatorsPaths) {
            if (pathString.startsWith(generatorsPath)) {
                return true;
            }
        }

        return false;
    }
}
