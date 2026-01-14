import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function Drawer({ open, onClose, title, children }: Props) {
  if (!open) return null;

  return (
    <div className="drawerRoot" role="dialog" aria-modal="true">
      <div className="drawerOverlay" onClick={onClose} />

      <aside className="drawerPanel">
        <div className="drawerHeader">
          <div className="drawerTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="drawerBody">{children}</div>
      </aside>
    </div>
  );
}
