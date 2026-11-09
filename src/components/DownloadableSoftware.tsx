import React, { useMemo, useState } from 'react';
import { ChevronDown, Download, PackageOpen, Search, X } from 'lucide-react';

interface SoftwareItem {
  name: string;
  domain: string; // used for the icon
  desc: string;
  license: 'Mã nguồn mở' | 'Miễn phí' | 'Miễn phí cá nhân' | 'Dùng thử';
  url: string; // official download page
}

interface SoftwareGroup {
  title: string;
  items: SoftwareItem[];
}

const SOFTWARE_GROUPS: SoftwareGroup[] = [
  {
    title: 'Đồ hoạ & Hình ảnh',
    items: [
      { name: 'Krita', domain: 'krita.org', license: 'Mã nguồn mở', url: 'https://krita.org/en/download/',
        desc: 'Vẽ tranh kỹ thuật số, minh hoạ và truyện tranh với bộ cọ phong phú, hỗ trợ bảng vẽ cảm ứng lực.' },
      { name: 'Blender', domain: 'blender.org', license: 'Mã nguồn mở', url: 'https://www.blender.org/download/',
        desc: 'Bộ công cụ 3D toàn diện: dựng mô hình, điêu khắc, diễn hoạt, render và dựng phim.' },
      { name: 'Paint.NET', domain: 'getpaint.net', license: 'Miễn phí', url: 'https://www.getpaint.net/download.html',
        desc: 'Chỉnh sửa ảnh nhẹ, dễ dùng trên Windows: hỗ trợ layer, hiệu ứng và nhiều plugin mở rộng.' },
      { name: 'GIMP', domain: 'gimp.org', license: 'Mã nguồn mở', url: 'https://www.gimp.org/downloads/',
        desc: 'Phần mềm chỉnh sửa ảnh chuyên nghiệp, thay thế miễn phí cho Photoshop: retouch, ghép ảnh, vẽ.' },
      { name: 'IrfanView', domain: 'irfanview.com', license: 'Miễn phí', url: 'https://www.irfanview.com/64bit.htm',
        desc: 'Xem ảnh siêu nhanh, đổi định dạng và đổi tên / thay kích thước hàng loạt.' },
      { name: 'XnView MP', domain: 'xnview.com', license: 'Miễn phí', url: 'https://www.xnview.com/en/xnviewmp/#downloads',
        desc: 'Quản lý và xem hơn 500 định dạng ảnh, chuyển đổi hàng loạt, đọc dữ liệu EXIF.' },
      { name: 'Inkscape', domain: 'inkscape.org', license: 'Mã nguồn mở', url: 'https://inkscape.org/release/',
        desc: 'Thiết kế đồ hoạ vector (SVG): logo, biểu tượng, sơ đồ và ấn phẩm in ấn.' },
      { name: 'FastStone Image Viewer', domain: 'faststone.org', license: 'Miễn phí', url: 'https://www.faststone.org/FSViewerDownload.htm',
        desc: 'Xem, chỉnh sửa cơ bản và trình chiếu ảnh; so sánh ảnh và xử lý hàng loạt.' },
      { name: 'Greenshot', domain: 'getgreenshot.org', license: 'Mã nguồn mở', url: 'https://getgreenshot.org/downloads/',
        desc: 'Chụp màn hình nhanh, chú thích, đánh dấu và che thông tin nhạy cảm trên ảnh chụp.' },
      { name: 'ShareX', domain: 'getsharex.com', license: 'Mã nguồn mở', url: 'https://getsharex.com/downloads',
        desc: 'Chụp và quay màn hình, tạo GIF, nhận dạng chữ (OCR) và tải lên chia sẻ tự động.' },
    ],
  },
  {
    title: 'In 3D',
    items: [
      { name: 'Bambu Studio', domain: 'bambulab.com', license: 'Mã nguồn mở', url: 'https://bambulab.com/en/download/studio',
        desc: 'Phần mềm cắt lớp (slicer) cho máy in 3D, tối ưu cho Bambu Lab, hỗ trợ in nhiều màu.' },
      { name: 'UltiMaker Cura', domain: 'ultimaker.com', license: 'Mã nguồn mở', url: 'https://ultimaker.com/software/ultimaker-cura/',
        desc: 'Slicer phổ biến cho hầu hết máy in 3D FDM, có sẵn hồ sơ in cho hàng trăm dòng máy.' },
    ],
  },
  {
    title: 'Văn phòng & Tài liệu',
    items: [
      { name: 'Foxit PDF Reader', domain: 'foxit.com', license: 'Miễn phí', url: 'https://www.foxit.com/pdf-reader/',
        desc: 'Đọc PDF nhanh, ghi chú, điền biểu mẫu và ký tài liệu điện tử.' },
      { name: 'LibreOffice', domain: 'libreoffice.org', license: 'Mã nguồn mở', url: 'https://www.libreoffice.org/download/download-libreoffice/',
        desc: 'Bộ văn phòng đầy đủ: soạn thảo, bảng tính, trình chiếu; tương thích tốt với tệp Microsoft Office.' },
      { name: 'SumatraPDF', domain: 'sumatrapdfreader.org', license: 'Mã nguồn mở', url: 'https://www.sumatrapdfreader.org/download-free-pdf-viewer',
        desc: 'Trình đọc PDF, EPUB, MOBI, CBZ siêu nhẹ, khởi động tức thì, có bản portable.' },
      { name: 'CutePDF Writer', domain: 'cutepdf.com', license: 'Miễn phí', url: 'https://www.cutepdf.com/Products/CutePDF/writer.asp',
        desc: 'Máy in ảo giúp xuất mọi tài liệu thành PDF từ bất kỳ phần mềm nào có lệnh In.' },
      { name: 'PDF24 Creator', domain: 'pdf24.org', license: 'Miễn phí', url: 'https://tools.pdf24.org/en/creator',
        desc: 'Bộ công cụ PDF ngoại tuyến: tạo, gộp, tách, nén, chuyển đổi và nhận dạng chữ OCR.' },
      { name: 'Ghostscript', domain: 'ghostscript.com', license: 'Mã nguồn mở', url: 'https://ghostscript.com/releases/gsdnld.html',
        desc: 'Bộ thông dịch PostScript / PDF dùng để chuyển đổi, nén PDF; là nền tảng cho nhiều phần mềm khác.' },
      { name: 'Apache OpenOffice', domain: 'openoffice.org', license: 'Mã nguồn mở', url: 'https://www.openoffice.org/download/',
        desc: 'Bộ văn phòng miễn phí lâu đời: Writer, Calc, Impress, hỗ trợ định dạng OpenDocument.' },
    ],
  },
  {
    title: 'Trình duyệt web',
    items: [
      { name: 'Google Chrome', domain: 'www.google.com/chrome', license: 'Miễn phí', url: 'https://www.google.com/chrome/',
        desc: 'Trình duyệt nhanh, phổ biến nhất; đồng bộ dấu trang, mật khẩu qua tài khoản Google và kho tiện ích lớn.' },
      { name: 'Opera', domain: 'opera.com', license: 'Miễn phí', url: 'https://www.opera.com/download',
        desc: 'Trình duyệt có sẵn chặn quảng cáo, VPN miễn phí và thanh bên tích hợp ứng dụng nhắn tin.' },
      { name: 'Mozilla Firefox', domain: 'firefox.com', license: 'Mã nguồn mở', url: 'https://www.mozilla.org/firefox/new/',
        desc: 'Trình duyệt chú trọng quyền riêng tư, chống theo dõi mặc định, nhiều tiện ích mở rộng.' },
      { name: 'Microsoft Edge', domain: 'www.microsoft.com/edge', license: 'Miễn phí', url: 'https://www.microsoft.com/edge/download',
        desc: 'Trình duyệt mặc định của Windows, nhân Chromium; tiết kiệm pin, đọc PDF và tích hợp Copilot.' },
      { name: 'Brave', domain: 'brave.com', license: 'Mã nguồn mở', url: 'https://brave.com/download/',
        desc: 'Trình duyệt chặn quảng cáo và trình theo dõi sẵn có, tải trang nhanh, bảo vệ quyền riêng tư.' },
      { name: 'Vivaldi', domain: 'vivaldi.com', license: 'Miễn phí', url: 'https://vivaldi.com/download/',
        desc: 'Trình duyệt tuỳ biến cao: xếp nhóm tab, chia màn hình, có sẵn email, lịch và ghi chú.' },
    ],
  },
  {
    title: 'Bảo mật & Diệt virus',
    items: [
      { name: 'Malwarebytes', domain: 'malwarebytes.com', license: 'Miễn phí', url: 'https://www.malwarebytes.com/mwb-download',
        desc: 'Quét và gỡ bỏ mã độc, phần mềm quảng cáo, ransomware mà phần mềm diệt virus thường bỏ sót.' },
      { name: 'Avast Free Antivirus', domain: 'avast.com', license: 'Miễn phí', url: 'https://www.avast.com/free-antivirus-download',
        desc: 'Diệt virus miễn phí, bảo vệ thời gian thực, quét Wi-Fi và cảnh báo trang web lừa đảo.' },
      { name: 'AVG AntiVirus Free', domain: 'avg.com', license: 'Miễn phí', url: 'https://www.avg.com/free-antivirus-download',
        desc: 'Bảo vệ máy tính khỏi virus, phần mềm gián điệp và tệp đính kèm email nguy hiểm.' },
      { name: 'Spybot 2', domain: 'safer-networking.org', license: 'Miễn phí cá nhân', url: 'https://www.safer-networking.org/products/spybot-free-edition/',
        desc: 'Tìm và gỡ phần mềm gián điệp (spyware), dọn dấu vết theo dõi và miễn dịch trình duyệt.' },
      { name: 'Avira Free Antivirus', domain: 'avira.com', license: 'Miễn phí', url: 'https://www.avira.com/en/free-antivirus-windows',
        desc: 'Diệt virus nhẹ, tỉ lệ phát hiện cao, kèm VPN và trình quản lý mật khẩu cơ bản.' },
      { name: 'SUPERAntiSpyware', domain: 'superantispyware.com', license: 'Miễn phí', url: 'https://www.superantispyware.com/download.html',
        desc: 'Quét bổ sung để phát hiện và gỡ spyware, adware, trojan; chạy song song với phần mềm diệt virus.' },
    ],
  },
  {
    title: 'Nhắn tin & Liên lạc',
    items: [
      { name: 'Zoom', domain: 'zoom.us', license: 'Miễn phí', url: 'https://zoom.us/download',
        desc: 'Họp trực tuyến, học online bằng video; chia sẻ màn hình và ghi lại cuộc họp.' },
      { name: 'Discord', domain: 'discord.com', license: 'Miễn phí', url: 'https://discord.com/download',
        desc: 'Trò chuyện văn bản, thoại và video theo máy chủ cộng đồng; phổ biến với nhóm học tập và game thủ.' },
      { name: 'Microsoft Teams', domain: 'teams.microsoft.com', license: 'Miễn phí', url: 'https://www.microsoft.com/microsoft-teams/download-app',
        desc: 'Nhắn tin, họp video và làm việc nhóm, tích hợp chặt chẽ với Office / Microsoft 365.' },
      { name: 'Slack', domain: 'slack.com', license: 'Miễn phí', url: 'https://slack.com/downloads',
        desc: 'Nhắn tin công việc theo kênh, tích hợp nhiều ứng dụng và công cụ tự động hoá.' },
      { name: 'Telegram', domain: 'telegram.org', license: 'Mã nguồn mở', url: 'https://desktop.telegram.org/',
        desc: 'Nhắn tin nhanh, đồng bộ đa thiết bị, gửi tệp dung lượng lớn; có nhóm và kênh tới hàng nghìn thành viên.' },
      { name: 'WhatsApp', domain: 'whatsapp.com', license: 'Miễn phí', url: 'https://www.whatsapp.com/download',
        desc: 'Nhắn tin và gọi điện được mã hoá đầu-cuối, đồng bộ với ứng dụng trên điện thoại.' },
      { name: 'Pidgin', domain: 'pidgin.im', license: 'Mã nguồn mở', url: 'https://pidgin.im/install/',
        desc: 'Ứng dụng chat đa giao thức: gom nhiều tài khoản nhắn tin (XMPP, IRC…) vào một cửa sổ.' },
      { name: 'Thunderbird', domain: 'thunderbird.net', license: 'Mã nguồn mở', url: 'https://www.thunderbird.net/',
        desc: 'Ứng dụng email của Mozilla: quản lý nhiều hộp thư, lịch, danh bạ và lọc thư rác.' },
      { name: 'Trillian', domain: 'trillian.im', license: 'Miễn phí', url: 'https://trillian.im/get/',
        desc: 'Nhắn tin tức thời cho cá nhân và doanh nghiệp, đồng bộ lịch sử trò chuyện giữa các thiết bị.' },
    ],
  },
  {
    title: 'Âm thanh & Video',
    items: [
      { name: 'iTunes', domain: 'apple.com', license: 'Miễn phí', url: 'https://www.apple.com/itunes/',
        desc: 'Quản lý nhạc, video và sao lưu / đồng bộ iPhone, iPad với máy tính Windows.' },
      { name: 'VLC Media Player', domain: 'videolan.org', license: 'Mã nguồn mở', url: 'https://www.videolan.org/vlc/',
        desc: 'Phát gần như mọi định dạng âm thanh, video và luồng trực tuyến mà không cần cài thêm codec.' },
      { name: 'AIMP', domain: 'aimp.ru', license: 'Miễn phí', url: 'https://www.aimp.ru/?do=download',
        desc: 'Trình nghe nhạc nhẹ, chất lượng âm thanh cao, có bộ chỉnh âm (EQ) và nghe radio online.' },
      { name: 'foobar2000', domain: 'foobar2000.org', license: 'Miễn phí', url: 'https://www.foobar2000.org/download',
        desc: 'Trình phát nhạc tối giản cho người chơi âm thanh: hỗ trợ FLAC, gắn thẻ và tuỳ biến giao diện sâu.' },
      { name: 'Winamp', domain: 'winamp.com', license: 'Miễn phí', url: 'https://www.winamp.com/',
        desc: 'Trình nghe nhạc kinh điển với giao diện skin, danh sách phát và plugin mở rộng.' },
      { name: 'MusicBee', domain: 'getmusicbee.com', license: 'Miễn phí', url: 'https://getmusicbee.com/downloads/',
        desc: 'Quản lý thư viện nhạc lớn, tự động gắn thẻ, tải ảnh bìa và đồng bộ với thiết bị.' },
      { name: 'Audacity', domain: 'audacityteam.org', license: 'Mã nguồn mở', url: 'https://www.audacityteam.org/download/',
        desc: 'Thu âm và chỉnh sửa âm thanh: cắt ghép, khử ồn, thêm hiệu ứng, xuất MP3 / WAV.' },
      { name: 'K-Lite Codec Pack', domain: 'codecguide.com', license: 'Miễn phí', url: 'https://codecguide.com/download_kl.htm',
        desc: 'Bộ codec giúp Windows phát được hầu hết định dạng video / âm thanh, kèm Media Player Classic.' },
      { name: 'Spotify', domain: 'spotify.com', license: 'Miễn phí', url: 'https://www.spotify.com/download/',
        desc: 'Nghe nhạc và podcast trực tuyến với kho hàng chục triệu bài hát (bản miễn phí có quảng cáo).' },
      { name: 'CCCP', domain: 'cccp-project.net', license: 'Miễn phí', url: 'https://www.cccp-project.net/',
        desc: 'Combined Community Codec Pack: bộ codec gọn nhẹ, tối ưu để xem anime và video có phụ đề.' },
      { name: 'MediaMonkey', domain: 'mediamonkey.com', license: 'Miễn phí', url: 'https://www.mediamonkey.com/download/',
        desc: 'Quản lý bộ sưu tập nhạc và video lớn, chuyển đổi định dạng, ghi đĩa và đồng bộ thiết bị.' },
      { name: 'HandBrake', domain: 'handbrake.fr', license: 'Mã nguồn mở', url: 'https://handbrake.fr/downloads.php',
        desc: 'Chuyển đổi và nén video sang MP4 / MKV với các cấu hình sẵn cho điện thoại, web.' },
      { name: 'OBS Studio', domain: 'obsproject.com', license: 'Mã nguồn mở', url: 'https://obsproject.com/download',
        desc: 'Quay màn hình và livestream chuyên nghiệp: ghép nhiều nguồn hình, âm thanh, chuyển cảnh.' },
    ],
  },
  {
    title: 'Nén & Giải nén',
    items: [
      { name: '7-Zip', domain: '7-zip.org', license: 'Mã nguồn mở', url: 'https://www.7-zip.org/download.html',
        desc: 'Nén / giải nén tỉ lệ cao với định dạng 7z, hỗ trợ ZIP, RAR, ISO và đặt mật khẩu AES-256.' },
      { name: 'PeaZip', domain: 'peazip.github.io', license: 'Mã nguồn mở', url: 'https://peazip.github.io/',
        desc: 'Trình nén đa năng hỗ trợ hơn 200 định dạng, có mã hoá mạnh và giao diện thân thiện.' },
      { name: 'WinRAR', domain: 'win-rar.com', license: 'Dùng thử', url: 'https://www.win-rar.com/download.html',
        desc: 'Nén và giải nén RAR / ZIP phổ biến, chia nhỏ tệp, sửa tệp nén bị lỗi.' },
    ],
  },
  {
    title: 'Chia sẻ tệp',
    items: [
      { name: 'qBittorrent', domain: 'qbittorrent.org', license: 'Mã nguồn mở', url: 'https://www.qbittorrent.org/download',
        desc: 'Tải tệp qua giao thức BitTorrent, không quảng cáo, có công cụ tìm kiếm tích hợp.' },
    ],
  },
  {
    title: 'Tiện ích hệ thống & Mạng',
    items: [
      { name: 'Wireshark', domain: 'wireshark.org', license: 'Mã nguồn mở', url: 'https://www.wireshark.org/download.html',
        desc: 'Bắt và phân tích gói tin mạng chi tiết, công cụ không thể thiếu khi chẩn đoán sự cố mạng.' },
      { name: 'PowerToys', domain: 'microsoft.com', license: 'Mã nguồn mở', url: 'https://learn.microsoft.com/windows/powertoys/install',
        desc: 'Bộ tiện ích của Microsoft cho Windows: chia cửa sổ, đổi tên hàng loạt, chọn màu, tìm kiếm nhanh.' },
      { name: 'AnyDesk', domain: 'anydesk.com', license: 'Miễn phí cá nhân', url: 'https://anydesk.com/download',
        desc: 'Điều khiển máy tính từ xa nhanh, độ trễ thấp; tiện hỗ trợ kỹ thuật cho người thân.' },
      { name: 'TeamViewer', domain: 'teamviewer.com', license: 'Miễn phí cá nhân', url: 'https://www.teamviewer.com/download/',
        desc: 'Điều khiển từ xa, truyền tệp và hỗ trợ kỹ thuật qua Internet trên nhiều nền tảng.' },
      { name: 'Windows App', domain: 'microsoft.com', license: 'Miễn phí', url: 'https://learn.microsoft.com/windows-app/overview',
        desc: 'Ứng dụng của Microsoft để kết nối Remote Desktop, Windows 365 và Azure Virtual Desktop.' },
      { name: 'ImgBurn', domain: 'imgburn.com', license: 'Miễn phí', url: 'https://www.imgburn.com/index.php?act=download',
        desc: 'Ghi đĩa CD / DVD / Blu-ray và tạo, ghi tệp ảnh đĩa ISO.' },
      { name: 'TightVNC', domain: 'tightvnc.com', license: 'Mã nguồn mở', url: 'https://www.tightvnc.com/download.php',
        desc: 'Điều khiển máy tính từ xa qua giao thức VNC, phù hợp trong mạng nội bộ.' },
      { name: 'UltraVNC', domain: 'uvnc.com', license: 'Mã nguồn mở', url: 'https://uvnc.com/downloads/ultravnc.html',
        desc: 'Điều khiển từ xa qua VNC cho Windows, có truyền tệp và chat giữa hai máy.' },
      { name: 'RustDesk', domain: 'rustdesk.com', license: 'Mã nguồn mở', url: 'https://github.com/rustdesk/rustdesk/releases',
        desc: 'Điều khiển từ xa thay thế TeamViewer, có thể tự dựng máy chủ riêng để bảo mật dữ liệu.' },
      { name: 'Tailscale', domain: 'tailscale.com', license: 'Miễn phí cá nhân', url: 'https://tailscale.com/download',
        desc: 'Tạo mạng riêng ảo (VPN) giữa các thiết bị của bạn chỉ trong vài phút, dựa trên WireGuard.' },
      { name: 'WireGuard', domain: 'wireguard.com', license: 'Mã nguồn mở', url: 'https://www.wireguard.com/install/',
        desc: 'Giao thức và ứng dụng VPN hiện đại: nhanh, gọn nhẹ và bảo mật cao.' },
      { name: 'TeraCopy', domain: 'codesector.com', license: 'Miễn phí cá nhân', url: 'https://www.codesector.com/teracopy',
        desc: 'Sao chép / di chuyển tệp nhanh hơn, có tạm dừng, bỏ qua lỗi và kiểm tra tính toàn vẹn.' },
      { name: 'CDBurnerXP', domain: 'cdburnerxp.se', license: 'Miễn phí', url: 'https://cdburnerxp.se/en/download',
        desc: 'Ghi đĩa dữ liệu, đĩa nhạc và tệp ISO lên CD, DVD, Blu-ray.' },
      { name: 'Revo Uninstaller', domain: 'revouninstaller.com', license: 'Miễn phí', url: 'https://www.revouninstaller.com/revo-uninstaller-free-download/',
        desc: 'Gỡ cài đặt phần mềm triệt để, dọn sạch tệp và khoá registry còn sót lại.' },
      { name: 'Launchy', domain: 'launchy.net', license: 'Mã nguồn mở', url: 'https://www.launchy.net/download.php',
        desc: 'Mở nhanh ứng dụng, tệp và thư mục chỉ bằng vài phím gõ.' },
      { name: 'WinDirStat', domain: 'windirstat.net', license: 'Mã nguồn mở', url: 'https://windirstat.net/download.html',
        desc: 'Hiển thị trực quan dung lượng ổ đĩa để tìm và dọn các tệp, thư mục chiếm nhiều chỗ.' },
      { name: 'WizTree', domain: 'diskanalyzer.com', license: 'Miễn phí cá nhân', url: 'https://diskanalyzer.com/download',
        desc: 'Phân tích dung lượng ổ đĩa cực nhanh (quét ổ NTFS trong vài giây).' },
      { name: 'Advanced IP Scanner', domain: 'advanced-ip-scanner.com', license: 'Miễn phí', url: 'https://www.advanced-ip-scanner.com/',
        desc: 'Quét mạng LAN để liệt kê thiết bị, thư mục chia sẻ và điều khiển máy từ xa.' },
      { name: 'Glary Utilities', domain: 'glarysoft.com', license: 'Miễn phí', url: 'https://www.glarysoft.com/glary-utilities/',
        desc: 'Bộ công cụ dọn dẹp, tối ưu Windows: xoá tệp rác, sửa registry, quản lý khởi động.' },
      { name: 'InfraRecorder', domain: 'infrarecorder.org', license: 'Mã nguồn mở', url: 'https://infrarecorder.org/',
        desc: 'Ghi đĩa CD / DVD gọn nhẹ: ghi dữ liệu, đĩa nhạc, tạo và ghi tệp ảnh đĩa.' },
      { name: 'Open-Shell', domain: 'github.com', license: 'Mã nguồn mở', url: 'https://github.com/Open-Shell/Open-Shell-Menu/releases',
        desc: 'Khôi phục menu Start kiểu cổ điển (Windows 7) và tuỳ biến thanh tác vụ.' },
      { name: 'CCleaner', domain: 'ccleaner.com', license: 'Miễn phí', url: 'https://www.ccleaner.com/ccleaner/download',
        desc: 'Dọn tệp tạm, bộ nhớ đệm trình duyệt và quản lý chương trình khởi động cùng Windows.' },
    ],
  },
  {
    title: 'Lưu trữ đám mây',
    items: [
      { name: 'Dropbox', domain: 'dropbox.com', license: 'Miễn phí', url: 'https://www.dropbox.com/install',
        desc: 'Đồng bộ và sao lưu tệp lên đám mây, chia sẻ thư mục, khôi phục phiên bản cũ của tệp.' },
      { name: 'Google Drive for Desktop', domain: 'drive.google.com', license: 'Miễn phí', url: 'https://www.google.com/drive/download/',
        desc: 'Truy cập Google Drive như một ổ đĩa trên máy tính, tự đồng bộ tệp và ảnh (15 GB miễn phí).' },
      { name: 'OneDrive', domain: 'onedrive.live.com', license: 'Miễn phí', url: 'https://www.microsoft.com/microsoft-365/onedrive/download',
        desc: 'Lưu trữ đám mây của Microsoft, tích hợp sẵn Windows và Office, tự sao lưu Desktop, Tài liệu.' },
      { name: 'SugarSync', domain: 'sugarsync.com', license: 'Dùng thử', url: 'https://www.sugarsync.com/',
        desc: 'Đồng bộ bất kỳ thư mục nào lên đám mây và giữa nhiều máy tính, chia sẻ tệp bằng liên kết.' },
    ],
  },
  {
    title: 'Công cụ lập trình',
    items: [
      { name: 'Python', domain: 'python.org', license: 'Mã nguồn mở', url: 'https://www.python.org/downloads/',
        desc: 'Ngôn ngữ lập trình dễ học, dùng cho tự động hoá, phân tích dữ liệu, AI và web (có bản x64, ARM64).' },
      { name: 'Git', domain: 'git-scm.com', license: 'Mã nguồn mở', url: 'https://git-scm.com/downloads',
        desc: 'Hệ thống quản lý phiên bản mã nguồn, theo dõi thay đổi và làm việc nhóm hiệu quả.' },
      { name: 'GitHub Desktop', domain: 'desktop.github.com', license: 'Mã nguồn mở', url: 'https://desktop.github.com/',
        desc: 'Dùng Git và GitHub bằng giao diện đồ hoạ: commit, tạo nhánh, đẩy mã không cần dòng lệnh.' },
      { name: 'Docker Desktop', domain: 'docker.com', license: 'Miễn phí cá nhân', url: 'https://www.docker.com/products/docker-desktop/',
        desc: 'Chạy ứng dụng trong container, dựng môi trường phát triển đồng nhất trên mọi máy.' },
      { name: 'Node.js', domain: 'nodejs.org', license: 'Mã nguồn mở', url: 'https://nodejs.org/en/download',
        desc: 'Môi trường chạy JavaScript phía máy chủ, kèm npm để cài thư viện (chọn bản LTS khi tải).' },
      { name: 'FileZilla', domain: 'filezilla-project.org', license: 'Mã nguồn mở', url: 'https://filezilla-project.org/download.php?type=client',
        desc: 'Truyền tệp qua FTP / SFTP lên máy chủ, kéo-thả trực quan, quản lý nhiều kết nối.' },
      { name: 'Notepad++', domain: 'notepad-plus-plus.org', license: 'Mã nguồn mở', url: 'https://notepad-plus-plus.org/downloads/',
        desc: 'Trình soạn thảo văn bản / mã nguồn nhẹ, tô màu cú pháp cho hàng chục ngôn ngữ.' },
      { name: 'Sublime Text 4', domain: 'sublimetext.com', license: 'Dùng thử', url: 'https://www.sublimetext.com/download',
        desc: 'Trình soạn thảo mã nguồn cực nhanh, đa con trỏ, tìm kiếm mạnh và nhiều gói mở rộng.' },
      { name: 'WinSCP', domain: 'winscp.net', license: 'Mã nguồn mở', url: 'https://winscp.net/eng/download.php',
        desc: 'Truyền tệp an toàn giữa Windows và máy chủ qua SFTP, SCP, FTP; đồng bộ thư mục.' },
      { name: 'PuTTY', domain: 'putty.org', license: 'Mã nguồn mở', url: 'https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html',
        desc: 'Kết nối SSH / Telnet tới máy chủ và thiết bị mạng, quản lý khoá SSH.' },
      { name: 'WinMerge', domain: 'winmerge.org', license: 'Mã nguồn mở', url: 'https://winmerge.org/downloads/',
        desc: 'So sánh và hợp nhất khác biệt giữa hai tệp hoặc thư mục, tô sáng từng dòng thay đổi.' },
      { name: 'Eclipse IDE', domain: 'eclipse.org', license: 'Mã nguồn mở', url: 'https://www.eclipse.org/downloads/',
        desc: 'Môi trường phát triển tích hợp (IDE) cho Java, C/C++, PHP với hệ sinh thái plugin lớn.' },
      { name: 'Visual Studio Code', domain: 'code.visualstudio.com', license: 'Miễn phí', url: 'https://code.visualstudio.com/download',
        desc: 'Trình soạn thảo mã phổ biến nhất: gợi ý mã, gỡ lỗi, Git tích hợp và hàng nghìn tiện ích.' },
      { name: 'Cursor', domain: 'cursor.com', license: 'Miễn phí', url: 'https://cursor.com/downloads',
        desc: 'Trình soạn thảo mã tích hợp AI: viết, giải thích và sửa mã bằng ngôn ngữ tự nhiên.' },
    ],
  },
  {
    title: 'Khác',
    items: [
      { name: 'Evernote', domain: 'evernote.com', license: 'Miễn phí', url: 'https://evernote.com/download',
        desc: 'Ghi chú, lưu trang web, quét tài liệu và sắp xếp ý tưởng, đồng bộ trên mọi thiết bị.' },
      { name: 'Google Earth Pro', domain: 'earth.google.com', license: 'Miễn phí', url: 'https://www.google.com/earth/about/versions/',
        desc: 'Khám phá Trái Đất qua ảnh vệ tinh và 3D, đo khoảng cách, xem ảnh lịch sử của một địa điểm.' },
      { name: 'Steam', domain: 'steampowered.com', license: 'Miễn phí', url: 'https://store.steampowered.com/about/',
        desc: 'Nền tảng mua, tải và chơi game PC lớn nhất, kèm cộng đồng và kho game miễn phí.' },
      { name: 'Epic Games Launcher', domain: 'epicgames.com', license: 'Miễn phí', url: 'https://store.epicgames.com/download',
        desc: 'Cửa hàng game của Epic, tặng game miễn phí hằng tuần; dùng để cài Unreal Engine.' },
      { name: 'KeePass 2', domain: 'keepass.info', license: 'Mã nguồn mở', url: 'https://keepass.info/download.html',
        desc: 'Quản lý mật khẩu ngoại tuyến, lưu trong tệp cơ sở dữ liệu được mã hoá AES.' },
      { name: 'KeePassXC', domain: 'keepassxc.org', license: 'Mã nguồn mở', url: 'https://keepassxc.org/download/',
        desc: 'Quản lý mật khẩu đa nền tảng tương thích KeePass, tự điền mật khẩu trên trình duyệt.' },
      { name: '1Password', domain: '1password.com', license: 'Dùng thử', url: 'https://1password.com/downloads/',
        desc: 'Quản lý mật khẩu, thẻ và giấy tờ quan trọng; đồng bộ an toàn giữa các thiết bị và gia đình.' },
      { name: 'Bitwarden', domain: 'bitwarden.com', license: 'Mã nguồn mở', url: 'https://bitwarden.com/download/',
        desc: 'Quản lý mật khẩu mã hoá đầu-cuối, bản miễn phí đồng bộ không giới hạn thiết bị.' },
      { name: 'Everything', domain: 'voidtools.com', license: 'Miễn phí', url: 'https://www.voidtools.com/downloads/',
        desc: 'Tìm tệp và thư mục theo tên gần như tức thì trên toàn bộ ổ đĩa Windows.' },
      { name: 'NVDA (NV Access)', domain: 'nvaccess.org', license: 'Mã nguồn mở', url: 'https://www.nvaccess.org/download/',
        desc: 'Trình đọc màn hình miễn phí giúp người khiếm thị sử dụng máy tính qua giọng nói và chữ nổi.' },
      { name: 'ChatGPT', domain: 'chatgpt.com', license: 'Miễn phí', url: 'https://openai.com/chatgpt/download/',
        desc: 'Trợ lý AI của OpenAI: trả lời câu hỏi, viết, tóm tắt và hỗ trợ học tập ngay trên máy tính.' },
      { name: 'Claude', domain: 'claude.ai', license: 'Miễn phí', url: 'https://claude.ai/download',
        desc: 'Trợ lý AI của Anthropic: phân tích tài liệu, viết lách, lập trình và trò chuyện tự nhiên.' },
      { name: 'Grammarly', domain: 'grammarly.com', license: 'Miễn phí', url: 'https://www.grammarly.com/desktop',
        desc: 'Kiểm tra chính tả, ngữ pháp và văn phong tiếng Anh trong mọi ứng dụng bạn gõ chữ.' },
    ],
  },
];

const TOTAL = SOFTWARE_GROUPS.reduce((n, g) => n + g.items.length, 0);

const SoftwareIcon: React.FC<{ item: SoftwareItem }> = ({ item }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
      {failed ? (
        <span className="text-lg font-extrabold text-blue-600">{item.name.charAt(0)}</span>
      ) : (
        <img
          src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=64`}
          alt=""
          className="w-7 h-7 object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
};

/** Lowercase and strip Vietnamese diacritics so "giai nen" matches "Giải nén". */
const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const SoftwareRow: React.FC<{ item: SoftwareItem }> = ({ item }) => (
  <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_13rem_1fr_auto] items-center gap-x-3 sm:gap-x-4 px-3 py-2.5 bg-white/[0.03] hover:bg-white/10 transition-colors">
    <SoftwareIcon item={item} />
    <h4 className="text-base sm:text-lg font-bold text-slate-100 sm:text-center">{item.name}</h4>
    <p className="hidden sm:block text-sm sm:text-[15px] text-slate-300 leading-relaxed sm:border-l sm:border-white/10 sm:pl-4">
      {item.desc}
    </p>
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Tải ${item.name} (${item.license})`}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
    >
      <Download className="w-4 h-4" />
      Tải về
    </a>
    <p className="sm:hidden col-start-2 col-span-2 text-sm text-slate-300 leading-snug -mt-0.5">{item.desc}</p>
  </div>
);

export const DownloadableSoftware: React.FC = () => {
  const [query, setQuery] = useState('');
  // Only the first group starts open so the 100+ rows don't flood the page.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([SOFTWARE_GROUPS[0].title]));

  const [groupFilter, setGroupFilter] = useState(''); // '' = all groups

  const q = normalize(query.trim());
  // Any active filter (text or group) shows matching groups fully expanded.
  const searching = q.length > 0 || groupFilter !== '';

  const visibleGroups = useMemo(() => {
    const groups = groupFilter ? SOFTWARE_GROUPS.filter((g) => g.title === groupFilter) : SOFTWARE_GROUPS;
    if (!q) return groups;
    return groups.map((g) => ({
      ...g,
      items: g.items.filter((it) => normalize(`${it.name} ${it.desc} ${g.title}`).includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [q, groupFilter]);

  const matchCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);
  const allOpen = openGroups.size === SOFTWARE_GROUPS.length;

  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <section id="downloadable-software" className="glass-panel rounded-2xl p-6 sm:p-8 mb-8">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
          <PackageOpen className="w-5 h-5" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">Phần mềm tiện ích ({TOTAL})</h2>
      </div>
      <p className="text-xs sm:text-sm text-slate-400 mb-5 max-w-3xl leading-relaxed">
        Tuyển chọn phần mềm phổ biến, an toàn cho học tập và công việc hằng ngày. Nút tải về dẫn thẳng đến trang chính thức của nhà phát triển.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm phần mềm theo tên hoặc chức năng (vd: nén, PDF, VPN)…"
            className="w-full bg-slate-900/70 border border-white/10 focus:border-emerald-500/60 focus:outline-none rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-100"
              aria-label="Xoá tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          aria-label="Lọc theo nhóm phần mềm"
          className="sm:w-64 bg-slate-900/70 border border-white/10 focus:border-emerald-500/60 focus:outline-none rounded-xl px-3 py-2.5 text-sm text-slate-100 cursor-pointer"
        >
          <option value="" className="bg-slate-900">Tất cả nhóm ({TOTAL})</option>
          {SOFTWARE_GROUPS.map((g) => (
            <option key={g.title} value={g.title} className="bg-slate-900">
              {g.title} ({g.items.length})
            </option>
          ))}
        </select>
        {!searching && (
          <button
            type="button"
            onClick={() => setOpenGroups(allOpen ? new Set() : new Set(SOFTWARE_GROUPS.map((g) => g.title)))}
            className="text-sm font-bold text-blue-400 hover:text-blue-300 whitespace-nowrap"
          >
            {allOpen ? 'Thu gọn tất cả' : 'Mở tất cả'}
          </button>
        )}
      </div>

      {searching && (
        <p className="text-sm text-slate-400 mb-4">
          {matchCount > 0 ? `Tìm thấy ${matchCount} phần mềm` : 'Không tìm thấy phần mềm phù hợp.'}
        </p>
      )}

      <div className="space-y-3">
        {visibleGroups.map((group) => {
          const isOpen = searching || openGroups.has(group.title);
          return (
            <div key={group.title} className="border border-white/10 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => !searching && toggleGroup(group.title)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <span className="text-base font-bold uppercase tracking-wider text-cyan-400">
                  {group.title} <span className="text-slate-500">({group.items.length})</span>
                </span>
                {!searching && (
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </button>
              {isOpen && (
                <div className="divide-y divide-white/10 border-t border-white/10">
                  {group.items.map((item) => (
                    <SoftwareRow key={item.name} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
