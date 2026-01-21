# 2026-01-21 Session 6: BBox Loading & Export Features

## 목표
도면 보관함에서 파일 불러올 때 bbox도 함께 로드하고, 다운로드 시 JSON metadata export 기능 추가

## 완료된 작업

### 1. Dashboard에서 BBox 불러오기 구현

#### 문제 상황
- Dashboard에서 파일 클릭 시 파일만 다운로드하고 bbox 데이터는 가져오지 않음
- PreviewPage에서 저장된 bbox가 표시되지 않음

#### 해결 방법
**파일**: `frontend/src/pages/dashboard/UserDashboard.tsx`

**수정 내용** (Line 148-177):
```typescript
const handleFileClick = async (file: FileItem) => {
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Fetch File Details WITH BBoxes
    const fileDetailsRes = await fetch(
        `http://localhost:8080/api/files/${file.id}`, 
        { headers }
    );
    const fileDetails = await fileDetailsRes.json();
    console.log('File with BBoxes:', fileDetails);

    // 2. Download File Blob
    const res = await fetch(
        `http://localhost:8080/api/files/${file.id}/download`, 
        { headers }
    );
    const blob = await res.blob();
    const fileObj = new File([blob], file.name, { type: blob.type });

    // 3. Convert BBoxes to coordinates format
    let coordinatesJson = undefined;
    if (fileDetails.bboxes && fileDetails.bboxes.length > 0) {
        const coordsArray = fileDetails.bboxes.map((bbox: any) => ({
            type: bbox.type,
            id: bbox.frontendId || `bbox-${bbox.id}`,
            rect: { 
                x: bbox.x, 
                y: bbox.y, 
                width: bbox.width, 
                height: bbox.height 
            },
            page: bbox.page || 1
        }));
        coordinatesJson = JSON.stringify(coordsArray);
    }

    // 4. Pass coordinates to PreviewPage
    openSingleFile(
        fileObj, 
        file.id, 
        undefined, 
        coordinatesJson, 
        fileDetails.rotation || 0
    );
    navigate('/preview');
};
```

**효과**:
- ✅ Dashboard에서 파일 클릭 시 bbox 자동 로드
- ✅ PreviewPage에서 저장된 bbox 정상 표시

### 2. 다운로드 시 BBox Metadata Export 구현

#### 기존 문제
- 다운로드 시 이미지만 다운로드됨
- bbox 좌표, rotation 정보 손실

#### 해결 방법
**파일**: `frontend/src/pages/preview/PreviewPage.tsx`

**수정 내용** (Line 38-80):
```typescript
const handleDownload = () => {
    if (!activeItem?.file) return;

    // 1. Download File (이미지/PDF)
    const fileUrl = URL.createObjectURL(activeItem.file);
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = activeItem.name;
    a.click();

    // 2. Download JSON with ALL BBoxes and Rotation
    const hasBBoxData = activeItem.coordinates || initialBBoxes.length > 0;
    
    if (hasBBoxData) {
        let bboxes = [];
        try {
            if (activeItem.coordinates) {
                bboxes = JSON.parse(activeItem.coordinates);
            } else if (initialBBoxes.length > 0) {
                bboxes = initialBBoxes;
            }
        } catch (e) {
            console.error('Failed to parse bbox data:', e);
        }

        const jsonContent = JSON.stringify({
            fileName: activeItem.name,
            fileId: activeItem.dbId,
            exportedAt: new Date().toISOString(),
            rotation: activeItem.rotation || 0,
            bboxes: bboxes,
            metadata: {
                fileSize: activeItem.file.size,
                mimeType: activeItem.file.type
            }
        }, null, 2);

        const blob = new Blob([jsonContent], { type: 'application/json' });
        const b = document.createElement('a');
        b.href = URL.createObjectURL(blob);
        b.download = `${activeItem.name.replace(/\.[^/.]+$/, '')}_metadata.json`;
        b.click();
    }
};
```

**다운로드 결과**:
- `파일명.pdf` - 원본 파일
- `파일명_metadata.json` - BBox 좌표 및 메타데이터

**JSON 구조**:
```json
{
  "fileName": "drawing.pdf",
  "fileId": 123,
  "exportedAt": "2026-01-21T14:00:00.000Z",
  "rotation": 0,
  "bboxes": [
    {
      "type": "title",
      "id": "bbox-1",
      "rect": { "x": 100, "y": 50, "width": 200, "height": 30 },
      "page": 1
    },
    {
      "type": "front",
      "id": "bbox-2",
      "rect": { "x": 150, "y": 200, "width": 400, "height": 300 },
      "page": 1
    }
  ],
  "metadata": {
    "fileSize": 1024000,
    "mimeType": "application/pdf"
  }
}
```

### 3. Code Cleanup

#### 제거된 코드
**파일**: `PreviewPage.tsx`
- `savedRect` state 제거 (더 이상 사용하지 않음)
- `setSavedRect`와 관련 useEffect 제거

**이유**: 
- `initialBBoxes`와 `activeItem.coordinates`로 통합
- 중복된 state 관리 제거

## 테스트 결과

### BBox Loading 테스트
- ✅ Dashboard에서 파일 클릭
- ✅ PreviewPage에서 표제란(title), 정면도(front) bbox 정상 표시
- ✅ Browser console에서 bbox 데이터 확인 가능

### Export 테스트
- ✅ 다운로드 버튼 클릭 시 2개 파일 생성 확인
- ✅ JSON 파일에 모든 bbox 좌표 포함
- ✅ Rotation 정보 포함
- ✅ 파일 메타데이터 포함

## 수정된 파일 목록

```
frontend/src/pages/dashboard/UserDashboard.tsx
frontend/src/pages/preview/PreviewPage.tsx
```

## 사용자 플로우

### 전체 워크플로우
```
1. 도면 업로드 → Preview에서 bbox 그리기 → 저장
2. Dashboard로 이동 → 파일 클릭 → bbox 자동 로드됨 ✅
3. PreviewPage에서 확인/수정 → 다운로드
4. 이미지 + JSON metadata 2개 파일 다운로드됨 ✅
```

## 기술 스택

**Frontend**:
- React + TypeScript
- File API (Blob, URL.createObjectURL)
- JSON serialization/deserialization

**API Integration**:
- `/api/files/{id}` - File details with bboxes
- `/api/files/{id}/download` - File binary

## 성과 지표

| 항목 | Before | After |
|------|--------|-------|
| Dashboard 파일 열기 | ❌ BBox 없음 | ✅ BBox 로드됨 |
| 다운로드 | ❌ 이미지만 | ✅ 이미지 + JSON |
| BBox 정보 보존 | ❌ 손실 | ✅ 완전 보존 |
| Export 형식 | - | ✅ JSON metadata |

## 다음 단계 (선택사항)

1. **Import 기능**: JSON을 업로드하여 bbox 복원
2. **Batch Export**: 여러 파일 한 번에 ZIP으로 다운로드
3. **PDF Annotation**: bbox를 PDF에 직접 그려서 export

**현재 상태**: ✅ PRODUCTION READY
