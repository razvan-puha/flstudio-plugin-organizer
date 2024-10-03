package com.imageline.flstudio_plugin_organizer.scheduled;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;


@Component
@Slf4j
public class DeleteFilesJob {

    @Scheduled(cron = "0 */2 * ? * *")
    public void deleteTemporaryFiles() {
        File[] files = new File(System.getProperty("java.io.tmpdir")).listFiles();
        if (files != null) {
            for (File file : files) {
                boolean deleted = file.delete();
                if (!deleted) {
                    log.warn("Unable to delete file {}", file.getAbsolutePath());
                } else {
                    log.info("Deleted: {}", file.getAbsolutePath());
                }
            }
        }
    }
}
