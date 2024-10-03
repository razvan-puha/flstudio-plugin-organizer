package com.imageline.flstudio_plugin_organizer.controller;

import com.imageline.flstudio_plugin_organizer.service.OrganizerService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PluginOrganizerController {

    private final OrganizerService organizerService;

    @PostMapping(value = "/process", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UrlResource> processZip(@RequestPart MultipartFile file) throws Exception {
        return organizerService.processZip(file);
    }
}
