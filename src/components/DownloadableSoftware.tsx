import React, { useState } from 'react';
import { Download, PackageOpen } from 'lucide-react';

interface SoftwareItem {
  name: string;
  domain: string; // used for the icon
  desc: string;
  license: 'Mã nguồn mở' | 'Miễn phí';
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
];

const TOTAL = SOFTWARE_GROUPS.reduce((n, g) => n + g.items.length, 0);

const SoftwareIcon: React.FC<{ item: SoftwareItem }> = ({ item }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
      {failed ? (
        <span className="text-lg font-extrabold text-blue-600">{item.name.charAt(0)}</span>
      ) : (
        <img
          src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=64`}
          alt=""
          className="w-8 h-8 object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
};

export const DownloadableSoftware: React.FC = () => (
  <section id="downloadable-software" className="glass-panel rounded-2xl p-6 sm:p-8 mt-8">
    <div className="flex items-center gap-2.5 mb-2">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
        <PackageOpen className="w-5 h-5" />
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">Phần mềm tiện ích ({TOTAL})</h2>
    </div>
    <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-3xl leading-relaxed">
      Tuyển chọn phần mềm miễn phí, an toàn cho công việc hằng ngày. Nút tải về dẫn thẳng đến trang chính thức của nhà phát triển.
    </p>

    <div className="space-y-8">
      {SOFTWARE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3">
            {group.title} <span className="text-slate-500">({group.items.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((item) => (
              <div
                key={item.name}
                className="flex flex-col bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <SoftwareIcon item={item} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-100 truncate">{item.name}</h4>
                    <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {item.license}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">{item.desc}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải về
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);
