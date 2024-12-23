export interface PluginList {
  effects: VendorPlugins;
  generators: VendorPlugins;
}

export interface VendorPlugins {
  [vendorName: string]: string[];
}

// Example type usage:
// const response: PluginList = {
//   Effects: {
//     "Native Instruments": ["Massive X", "Guitar Rig 6"],
//     "FabFilter": ["Pro-Q 3", "Pro-L 2"]
//   },
//   Generators: {
//     "Xfer": ["Serum", "LFOTool"],
//     "Vital Audio": ["Vital"]
//   }
// }; 