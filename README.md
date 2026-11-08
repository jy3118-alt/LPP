# LPP — Private Press (Web)

아이폰 Safari에서 주소를 열어 쓰는 개인용 레코드 플레이어 PWA. 기존 소장 사이트를 같은 주소에서 업데이트해 IndexedDB 음악 데이터를 유지합니다. 웹뷰나 Xcode 설치, 앱 서명은 필요 없습니다. 기존 네이티브 프로젝트는 상위 LPP 폴더에 보존되어 있습니다.

## 사용
1. 배포 주소를 Safari에서 열고 본인의 ChatGPT 계정으로 로그인합니다. 사이트는 소유자만 접속할 수 있도록 유지합니다.
2. 원하면 공유 → 홈 화면에 추가. 홈 화면의 LPP를 연 뒤 음악을 가져오는 것을 권장합니다.
3. 레코드 가져오기 → 파일 앱의 음악 선택. 파일은 서버로 전송하지 않고 IndexedDB에 저장됩니다.
4. 처음 둘러볼 때는 예시 레코드 들어보기. 직접 합성한 18초 WAV가 들어 있습니다.
5. 설정의 ‘지글지글 움직임’으로 글자와 아이콘 모션을 켜고 끕니다.

## 디자인과 폰트
- 딥 블랙 #050505, 네온 오렌지 #FF5A00, 아이보리 #EDE7D8.
- LP 재킷 그리드, 회전하는 바이닐, 움직이는 톤암.
- LPP 전용 SVG 아이콘에 서로 다른 네 잉크 프레임과 작은 위치 변화를 적용해 실제로 떨리도록 구현했습니다.
- 전 텍스트에 이전에 제작한 Noto Serif KR 기반 Open Cosmos Ink KR Full 가변 폰트를 적용했습니다. 한글 11,172자, 기본 영문, 호환 자모, 포함된 구두점을 지원합니다. 출처 폰트의 BOIL 축 0–3을 단계적으로 바꿉니다. 원본 폰트는 수정하지 않고 WOFF 서브셋으로 패키징했습니다.
- 폰트 라이선스와 원저작권은 dist/fonts/OFL.txt에 포함합니다.
- 원본 폰트에서 지원하지 않는 외국 문자/기호는 브라우저 대체 글꼴로 표시될 수 있습니다. 기본 레이블에서는 지원 글자를 사용하고 버튼 아이콘은 SVG로 표시합니다.
- 시스템의 동작 줄이기를 존중하며, 문서가 백그라운드로 이동하면 글자와 아이콘 애니메이션을 일시정지합니다.

## 저장과 오프라인
- 소장 시절의 sojang-music IndexedDB 및 tracks 스토어를 보존합니다.
- 음악과 커버는 기기/브라우저별로 보관되며 자동 동기화되지 않습니다.
- 서비스 워커가 앱과 전체 폰트 파일을 백그라운드로 준비합니다. 폰트 전체는 약 18.5 MB이며 처음에는 연결이 필요합니다. 설정에서 오프라인 준비 상태를 표시합니다.
- 캐시 갱신은 이전 음악 데이터베이스에 손대지 않습니다.
- Safari 데이터 삭제, 홈 화면 앱 삭제, 기기의 공간 정리로 음악이 사라질 수 있으니 원본은 별도로 보관하세요.
- 잠금 화면/백그라운드 연속 재생 및 설치 앱의 오프라인 실행은 실제 iOS/Safari 환경에 따라 다릅니다. 실제 아이폰에서 비행기 모드와 잠금 화면 재생 확인이 필요합니다.

## 검증
브라우저에서 390×844 모바일 화면, 가로 넘침 없음, 전체 텍스트의 LPP Ink 글꼴 적용, BOIL 축의 실제 변화, 아이콘 프레임 변화, 설정으로 움직임 중단 및 글꼴/아이콘 정지, WAV 재생(18초), 기존 보관함·좋아요 데이터 읽기, 검색 빈 결과, 앱 파일 오프라인 준비 완료 표시를 확인했습니다. JavaScript 구문 확인을 통과했습니다. 실제 아이폰 하드웨어에서의 재생 지속성은 검증하지 않았습니다.

## 로컬 실행
`python3 -m http.server 4173 --directory dist`

## Reactive grooves / English UI update
The player now renders ten concentric rough rings using Canvas and projects their 3D coordinates into the screen. A Web Audio analyser reads the existing audio element locally: RMS controls intensity, low-frequency energy controls depth, mid/high frequency bands shape the contours, and spectral centroid/flatness/flux control color and jitter. This is frequency-based audio reactivity, not musical-note or instrument recognition. The visual pauses when hidden and becomes a static impression when motion is off. No microphone access is used. The direct audio destination connection remains separate from the analysis branch.

All product copy is English. Imported titles and artist names retain the user's original text. Explanatory paragraphs, slogans, technical captions and long setup text have been removed from the main flow. Settings uses short rows; Home Screen setup has three steps.

## Lock-screen playback improvement
The audible HTML audio element is now independent of Web Audio. Visualization reads a synchronized, silent analysis element through an analyser and a zero-gain output. When the page is hidden only the analysis copy and visual rendering pause. The actual music element keeps its native playback route. The supported Audio Session API is set to playback and Media Session playback state follows the audible element. Analysis startup no longer blocks music playback. This improves resilience to iOS suspending AudioContext; actual iPhone lock-screen and next-track behavior still require physical-device testing.

## Smooth depth update
The main reactive record no longer quantizes the rough contour into ink frames. Continuous phase, spatial waveform averaging, low-pass feature envelopes, per-point contour/depth smoothing and eased color produce continuous motion. Icon and type boiling are unchanged. A stable camera shows actual Z displacement of the ten ring layers; amplitude no longer acts primarily by tilting the camera. The silent analysis copy also resets the prior spectrum on track changes.
