export interface FileObj {
  filename: string;
  handle: any;
  category: string | null;
  folderHandle: any | null;
  date: string;
  time: string;
  title: string;
  dateSource: string;
  content: string;
}

export interface PhysicalFolder {
  name: string;
  handle: any;
}

export interface CategoryObj {
  name: string;
  handle: any | null;
  files: FileObj[];
}

declare global {
  interface Window {
    showDirectoryPicker?: any;
    __draggedFiles: any;
  }
}
