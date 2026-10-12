import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#166949",
        color: "white",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 25,
        fontWeight: 700,
      }}
    >
      Q
    </div>,
    size,
  );
}
