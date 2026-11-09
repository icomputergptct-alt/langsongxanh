import React, { useState } from 'react';
import { Download, PackageOpen } from 'lucide-react';

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

export const DownloadableSoftware: React.FC = () => (
  <section id="downloadable-software" className="glass-panel rounded-2xl p-6 sm:p-8 mb-8">
    <div className="flex items-center gap-2.5 mb-2">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
        <PackageOpen className="w-5 h-5" />
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">Phần mềm tiện ích ({TOTAL})</h2>
    </div>
    <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-3xl leading-relaxed">
      Tuyển chọn phần mềm phổ biến, an toàn cho học tập và công việc hằng ngày. Nút tải về dẫn thẳng đến trang chính thức của nhà phát triển.
    </p>

    <div className="space-y-6">
      {SOFTWARE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400 mb-3">
            {group.title} <span className="text-slate-500">({group.items.length})</span>
          </h3>
          <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10">
            {group.items.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_13rem_1fr_auto] items-center gap-x-3 sm:gap-x-4 px-3 py-2.5 bg-white/[0.03] hover:bg-white/10 transition-colors"
              >
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
                <p className="sm:hidden col-start-2 col-span-2 text-sm text-slate-300 leading-snug -mt-0.5">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);
