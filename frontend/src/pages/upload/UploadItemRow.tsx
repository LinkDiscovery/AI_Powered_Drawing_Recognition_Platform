type Status = 'uploading' | 'processing' | 'ready' | 'error';

type UploadItem = {
  id: string;
  name: string;
  sizeText: string;
  progress: number;
  status: Status;
  message?: string;
};

function statusLabel(s: Status) {
  if (s === 'uploading') return 'Uploading';
  if (s === 'processing') return 'Processing';
  if (s === 'ready') return 'Ready';
  return 'Error';
}

export default function UploadItemRow({
  item,
  active,
  onClick,
}: {
  item: UploadItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`fileRow ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="fileIcon">📄</div>

      <div className="fileMeta">
        <div className="fileName">{item.name}</div>
        <div className="fileSub">
          {item.sizeText}
          <span className="dot">·</span>
          <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
          {item.status === 'uploading' ? (
            <>
              <span className="dot">·</span>
              <span className="muted">{item.progress}%</span>
            </>
          ) : null}
        </div>

        {item.status === 'uploading' ? (
          <div className="progressBar">
            <div className="progressFill" style={{ width: `${item.progress}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
