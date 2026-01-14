import { useMemo, useState } from 'react';
import UploadItemRow from './UploadItemRow';

type Status = 'uploading' | 'processing' | 'ready' | 'error';

type UploadItem = {
  id: string;
  name: string;
  sizeText: string;
  progress: number; // 0~100
  status: Status;
  message?: string;
};

const mock: UploadItem[] = [
  { id: '1', name: 'sample-a.pdf', sizeText: '2.3 MB', progress: 100, status: 'ready' },
  { id: '2', name: 'sample-b.png', sizeText: '780 KB', progress: 62, status: 'uploading' },
  { id: '3', name: 'sample-c.pdf', sizeText: '5.1 MB', progress: 100, status: 'processing' },
];

export default function UploadListPanel() {
  const [selectedId, setSelectedId] = useState<string>('1');

  const selected = useMemo(
    () => mock.find((x) => x.id === selectedId),
    [selectedId]
  );

  const canPreview = selected?.status === 'ready';

  return (
    <div className="panel">
      <div className="panelHeader">
        <div>
          <h3 className="panelTitle">업로드한 파일</h3>
          <div className="panelSub">파일을 선택하면 Preview로 이동할 수 있어요.</div>
        </div>

        <button className={`btn ${canPreview ? 'primary' : ''}`} disabled={!canPreview}>
          Preview
        </button>
      </div>

      <div className="panelBody">
        {mock.map((item) => (
          <UploadItemRow
            key={item.id}
            item={item}
            active={item.id === selectedId}
            onClick={() => setSelectedId(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
