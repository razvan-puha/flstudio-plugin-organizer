"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";
import { Progress } from "@/components/ui/progress";
import { createRequestBody } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { PluginList, VendorPlugins } from "./types/plugins";
import { useStore } from "@/lib/store";
import { SplitView } from "@/components/folders/split-view";
import { FolderItem } from "@/types/folder";

const formSchema = z.object({
  zipFile: z.any(),
});

function createFolderItemsFromPlugins(
  plugins: VendorPlugins,
  type: "effects" | "generators"
): FolderItem[] {
  return Object.entries(plugins).map(([vendor, pluginList]) => ({
    id: `${vendor}`,
    name: vendor,
    type: "folder",
    children: pluginList.map((plugin) => ({
      id: `${plugin}`,
      name: plugin,
      type: "file",
      data: {
        vendor,
        plugin,
        pluginType: type
      }
    }))
  }));
}

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [hideProgress, setHideProgress] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [labelText, setLabelText] = useState("");
  const [showSplitViews, setShowSplitViews] = useState(false);

  const [effectsLeftFolderId] = useState("effects-root-left");
  const [effectsRightFolderId] = useState("effects-root-right");
  const [generatorsLeftFolderId] = useState("generators-root-left");
  const [generatorsRightFolderId] = useState("generators-root-right");
  const { getFolderContents } = useStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  const fileRef = form.register("zipFile");

  const onSubmit = () => {
    setHideProgress(false);
    setLabelText("Processing...");

    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/process", {
      method: "POST",
      body: createRequestBody(form.getValues().zipFile),
    })
      .then((response) => {
        if (response.ok) {
          return response.arrayBuffer();
        } else {
          console.log(response);
        }
      })
      .then((data) => {
        if (data != null) {
          setLabelText("Done!");
          setProgress(100);
          const blob = new Blob([data], { type: "application/zip" });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
        }
      })
      .catch((error) => {
        console.log(error);
      });

    setTimeout(() => {
      setLabelText("");
      setHideProgress(true);
      setProgress(0);
    }, 1500);
  };

  const loadZipFile = () => {
    fetch(process.env.NEXT_PUBLIC_API_URL + "/api/load", {
      method: "POST",
      body: createRequestBody(form.getValues().zipFile),
      headers: {
        "Accept": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json() as Promise<PluginList>;
        } else {
          console.log(response.json());
        }
      })
      .then((data: PluginList | undefined) => {
        if (data) {          
          // Create folder items for effects and generators
          const effectItems = createFolderItemsFromPlugins(data.effects, "effects");
          const generatorItems = createFolderItemsFromPlugins(data.generators, "generators");
          
          // Update the store with the items
          useStore.setState((state) => ({
            folderContents: {
              ...state.folderContents,
              [effectsLeftFolderId]: effectItems,
              [generatorsLeftFolderId]: generatorItems,
              [effectsRightFolderId]: [],
              [generatorsRightFolderId]: []
            }
          }));

          setShowSplitViews(true);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const onSubmitError = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    console.log(errors);
  };

  const downloadObject = (name: string) => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = name;

    document.body.appendChild(link);

    // Dispatch click event on the link
    // This is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setDownloadUrl("");
    setLabelText("");
    form.reset();
  };

  useEffect(() => {
    form.reset();
    setDownloadUrl("");
    setLabelText("");
    setProgress(0);
    setShowSplitViews(false);
  }, [form]);

  return (
    <div className="flex flex-col justify-between min-h-screen bg-neutral">
      <div className="flex-col items-start min-h-fit p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <div className="flex flex-col items-start w-full">
          <h3 className="text-2xl font-bold text-white">
            FL Studio Plugin Organizer
          </h3>
          <p className="text-lg mt-2 text-white">
            A little tool that I&apos;ve made for better organizing your 3rd
            party FL Studio plugins.
          </p>
          <br />
          <h3 className="text-xl font-bold text-white">How to use it?</h3>
          <p className="text-sm mt-2 text-white">
            After scanning your plugins in FL, just archive the result (aka the{" "}
            <b>
              <u>Installed</u>
            </b>{" "}
            folder) and upload it here.
          </p>
          <p className="text-sm mt-2 text-white">
            The result will be a zip file containing the{" "}
            <b>
              <u>User</u>
            </b>{" "}
            folder for both plugin types (<u>Effects</u> and <u>Generators</u>).
          </p>
          <p className="text-sm mt-2 text-white">
            Just copy it to your FL Studio plugins folder and that&apos;s it!
          </p>
        </div>
        <main className="w-full flex flex-col items-start sm:items-start">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onSubmitError)}
              className="w-full py-10 flex flex-row"
            >
              <FormField
                control={form.control}
                name="zipFile"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-white">
                      Select your FL Studio plugins zip file
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".zip"
                        placeholder="Select your zip file..."
                        className="text-gray-400 file:text-white file:font-bold file:hover:cursor-pointer file:pr-4"
                        {...fileRef}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                className="w ml-3 self-end text-white hover:bg-success"
                disabled={
                  form.getValues().zipFile == null ||
                  form.getValues().zipFile.length == 0
                }
                type="button"
                onClick={loadZipFile}
              >
                Load
              </Button>
              <Button
                type="submit"
                className="w ml-3 self-end text-white hover:bg-success"
                disabled={
                  form.getValues().zipFile == null ||
                  form.getValues().zipFile.length == 0
                }
              >
                Organize
              </Button>
              <Button
                className="ml-3 self-end text-white hover:bg-success"
                disabled={downloadUrl == ""}
                onClick={() => downloadObject("Results.zip")}
              >
                Download organized plugins
              </Button>
            </form>
          </Form>

          {showSplitViews && (
            <SplitView
              title="Effects"
              leftFolderId={effectsLeftFolderId}
              rightFolderId={effectsRightFolderId}
              className="mt-8"
              onMoveItem={(item, from, to) => {
                const sourceItems = getFolderContents(from);
                const updatedItems = sourceItems.filter((i) => i.id !== item.id);
                useStore.setState((state) => ({
                  folderContents: {
                    ...state.folderContents,
                    [from]: updatedItems,
                    [to]: [...getFolderContents(to), item],
                  },
                }));
              }}
            />
          )}

          {showSplitViews && (
            <SplitView
              title="Generators"
              leftFolderId={generatorsLeftFolderId}
              rightFolderId={generatorsRightFolderId}
              className="mt-8"
              onMoveItem={(item, from, to) => {
                const sourceItems = getFolderContents(from);
                const updatedItems = sourceItems.filter((i) => i.id !== item.id);
                useStore.setState((state) => ({
                  folderContents: {
                    ...state.folderContents,
                    [from]: updatedItems,
                    [to]: [...getFolderContents(to), item],
                  },
                }));
              }}
            />
          )}
        </main>
      </div>
      <div className="w-11/12 self-center pb-8">
        <Label htmlFor="progress" className="text-sm text-white">
          <b>{labelText}</b>
        </Label>
        <Progress
          className="mt-3"
          id="progress"
          value={progress}
          hidden={hideProgress}
        />
      </div>
    </div>
  );
}
