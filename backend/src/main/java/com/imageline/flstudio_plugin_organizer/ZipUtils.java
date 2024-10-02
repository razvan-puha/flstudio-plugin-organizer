package com.imageline.flstudio_plugin_organizer;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class ZipUtils {

    public static File zipDirectory(File directory) throws Exception {
        String resultFile = String.format("%s/organized_plugins_%s.zip", directory.getParent(), UUID.randomUUID());
        try (
                FileOutputStream fileOutputStream = new FileOutputStream(resultFile);
                ZipOutputStream zipOutputStream = new ZipOutputStream(fileOutputStream)
        ) {
            zipFile(directory, directory.getName(), zipOutputStream);
            return new File(resultFile);
        }
    }

    private static void zipFile(File fileToZip, String fileName, ZipOutputStream zipOut) throws IOException {
        if (fileToZip.isHidden()) {
            return;
        }
        if (fileToZip.isDirectory()) {
            if (fileName.endsWith("/")) {
                zipOut.putNextEntry(new ZipEntry(fileName));
                zipOut.closeEntry();
            } else {
                zipOut.putNextEntry(new ZipEntry(fileName + "/"));
                zipOut.closeEntry();
            }
            File[] children = fileToZip.listFiles();
            assert children != null;

            for (File childFile : children) {
                zipFile(childFile, fileName + "/" + childFile.getName(), zipOut);
            }

            return;
        }
        FileInputStream fis = new FileInputStream(fileToZip);
        ZipEntry zipEntry = new ZipEntry(fileName);
        zipOut.putNextEntry(zipEntry);

        byte[] bytes = new byte[1024];
        int length;

        while ((length = fis.read(bytes)) >= 0) {
            zipOut.write(bytes, 0, length);
        }
        fis.close();
    }
}
