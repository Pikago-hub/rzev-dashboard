declare module "react-world-flags" {
  import { FC } from "react";

  interface ReactWorldFlagsProps {
    code: string;
    width?: number;
    height?: number;
    fallback?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }

  const ReactWorldFlags: FC<ReactWorldFlagsProps>;

  export default ReactWorldFlags;
}
