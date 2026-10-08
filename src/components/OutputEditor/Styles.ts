import type { CSSProperties } from "react";

export const colors = {
  bodyBg: "#0f141d",           // Nền xám xanh đen sâu
  panelBg: "#161b26",          // Nền panel xám tối
  border: "#283243",           // Viền xanh xám công nghiệp
  headerBg: "#b71c1c",         // Header Đỏ Đô ĐH Hùng Vương
  headerText: "#ffffff",       // Chữ trắng nổi bật
  ribbonBg1: "#1e2636",        // Thanh công cụ gradient xanh đen
  ribbonBg2: "#121824",
  ribbonText: "#d0d7de",       // Chữ xám trắng
  ribbonActive: "#29b6f6",     // Xanh dương nhạt nổi bật (Highlight active)
  accentRed: "#d32f2f",        // Đỏ thương hiệu HVU
  accentBlue: "#1976d2",       // Xanh dương đậm HVU (Live data / Primary)
  gold: "#f4d03f",             // Vàng điểm nhấn
  selectedBarBg: "#1c2433",
  selectedBarText: "#64b5f6",  // Chữ xanh dương sáng
  rowSelected: "#1a2a40",      // Hàng được chọn (Xanh dương tối)
  ghost: "#3a4659",            // Viền nhạt/disabled
  danger: "#e53935",           // Đỏ cảnh báo / Emergency Stop
};

export const s = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    background: colors.bodyBg,
    color: colors.ribbonText,
    fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
    fontSize: 12,
    boxSizing: "border-box",
  } as CSSProperties,

  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "auto",
    padding: 6,
    boxSizing: "border-box",
  } as CSSProperties,

  panelHeader: {
    background: `linear-gradient(180deg, ${colors.headerBg} 0%, #8e1515 100%)`,
    color: colors.headerText,
    fontWeight: 600,
    padding: "4px 8px",
    fontSize: 12,
    borderBottom: `1px solid ${colors.gold}`, // Điểm nhấn viền vàng kim
  } as CSSProperties,

  stackCol: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    width: "100%",
    height: "100%",
    minHeight: 0,
    boxSizing: "border-box",
  } as CSSProperties,

  twoColRow: {
    display: "flex",
    alignItems: "stretch",
    flex: "2 1 0%",
    minHeight: 0,
    gap: 6,
    width: "100%",
    boxSizing: "border-box",
  } as CSSProperties,

  colPane: {
    flex: "1 1 0%",
    minWidth: 0,
    minHeight: 0,
    overflowY: "auto",
    background: colors.panelBg,
    border: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  } as CSSProperties,

  fullWidthPane: {
    flex: "1 1 0%",
    minHeight: 0,
    overflowY: "auto",
    width: "100%",
    background: colors.panelBg,
    border: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  } as CSSProperties,

  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    background: `linear-gradient(180deg, ${colors.ribbonBg1} 0%, ${colors.ribbonBg2} 100%)`,
    border: `1px solid ${colors.border}`,
    borderTop: "none",
    padding: 4,
    boxSizing: "border-box",
  } as CSSProperties,

  toolbarBtn: {
    background: `linear-gradient(180deg, #253144 0%, #17202e 100%)`,
    border: `1px solid #36465e`,
    color: "#ffffff",
    padding: "3px 8px",
    fontSize: 11,
    cursor: "pointer",
    borderRadius: 2,
  } as CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
    color: colors.ribbonText,
  } as CSSProperties,

  th: {
    background: "#121824",
    color: "#ffffff",
    textAlign: "left",
    padding: "5px 6px",
    borderBottom: `2px solid ${colors.accentBlue}`,
    fontWeight: 600,
  } as CSSProperties,

  td: {
    padding: "4px 6px",
    borderBottom: "1px solid #1f2838",
    color: "#ffffff",
  } as CSSProperties,

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    fontSize: 12,
    boxSizing: "border-box",
    color: colors.ribbonText,
  } as CSSProperties,

  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    minWidth: 0,
    boxSizing: "border-box",
  } as CSSProperties,

  fieldLabel: {
    flex: "0 0 100px",
    color: "#90a4ae",
  } as CSSProperties,

  fieldInput: {
    flex: "1 1 auto",
    minWidth: 0,
    width: "100%",
    fontSize: 12,
    padding: "2px 6px",
    border: `1px solid ${colors.border}`,
    borderRadius: 2,
    background: "#0a0d14",
    color: "#64b5f6", // Màu chữ số Xanh Dương Đổi mới
    fontFamily: '"Consolas", monospace',
    fontWeight: "bold",
    boxSizing: "border-box",
  } as CSSProperties,

  tabsRow: {
    display: "flex",
    gap: 2,
    padding: "4px 8px 0",
    background: "#10141e",
    borderBottom: `1px solid ${colors.border}`,
    boxSizing: "border-box",
  } as CSSProperties,

  tab: (active: boolean): CSSProperties => ({
    background: active ? colors.panelBg : "#18202c",
    border: `1px solid ${colors.border}`,
    borderBottom: active ? `1px solid ${colors.panelBg}` : "none",
    color: active ? "#ffffff" : "#8294aa",
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: active ? 600 : 400,
    marginBottom: active ? -1 : 0,
    borderTop: active ? `2px solid ${colors.accentRed}` : `1px solid ${colors.border}`,
  }),

  axisBlock: {
    flex: "1 1 0%",
    minWidth: 0,
    border: `1px solid ${colors.border}`,
    borderRadius: 3,
    background: "#111622",
    padding: "4px 0",
    boxSizing: "border-box",
  } as CSSProperties,

  axisBlockTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#64b5f6", // Xanh dương điểm nhấn
    padding: "0 6px 4px",
  } as CSSProperties,
};