package com.imageline.flstudio_plugin_organizer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FlStudioPluginOrganizerApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlStudioPluginOrganizerApplication.class, args);
	}

}
