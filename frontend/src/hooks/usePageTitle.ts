import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | DonorTrack` : "DonorTrack";
    return () => {
      document.title = "DonorTrack";
    };
  }, [title]);
}
