import { Article, QuizExam, SoftwareUtility, ExamAttempt, Comment } from '../types';

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Kiến trúc LLM Đa Tác tử (Multi-Agent) và Kỹ thuật Suy luận Chuỗi (Chain-of-Thought) trong Doanh nghiệp',
    slug: 'multi-agent-llm-enterprise-architecture',
    summary: 'Phân tích sâu mô hình phân rã nhiệm vụ đa tác tử (Agentic Workflows), phối hợp công cụ bất đồng bộ và tối ưu hóa chi phí token cho các hệ thống quy mô lớn.',
    content: `### 1. Sự dịch chuyển từ Prompting đơn lẻ sang Multi-Agent Workflows

Trong năm 2026, các ứng dụng AI doanh nghiệp đã vượt qua giai đoạn đơn thuần là một chatbot hỏi đáp. Thay vào đó, kiến trúc **Multi-Agent (Đa Tác tử)** đã trở thành chuẩn mực mới. Thay vì trông đợi một mô hình ngôn ngữ lớn (LLM) giải quyết toàn bộ bài toán phức tạp trong một lượt prompt, hệ thống được chia nhỏ thành các tác tử chuyên biệt:

* **Tác tử Lập kế hoạch (Planner Agent):** Nhận đề bài tổng thể từ người dùng, phân tách thành cây quyết định dạng Directed Acyclic Graph (DAG).
* **Tác tử Thực thi (Executor Agents):** Gồm Code Generator, SQL Query Runner, API Integrator.
* **Tác tử Phê bình & Đánh giá (Critic / Evaluator Agent):** Thẩm định kết quả đầu ra, kiểm tra lỗi cú pháp, tính nhất quán bảo mật và logic nghiệp vụ.

\`\`\`typescript
// Mô hình điều phối Agent Orchestrator tiêu biểu
interface AgentTask {
  id: string;
  type: 'ANALYSIS' | 'CODE_GEN' | 'SECURITY_AUDIT';
  payload: Record<string, unknown>;
  dependencies: string[];
}

class AgentOrchestrator {
  async executePlan(plan: AgentTask[]): Promise<ExecutionResult> {
    const topology = this.resolveGraphDependencies(plan);
    for (const batch of topology.executionBatches) {
      await Promise.all(batch.map(task => this.dispatchAgent(task)));
    }
    return this.synthesizeOutputs();
  }
}
\`\`\`

### 2. Tối ưu hóa Bộ nhớ Ngữ cảnh & Giảm Hallucination

Một trong những thách thức lớn nhất của hệ sinh thái Agentic là "suy thoái ngữ cảnh" (Context Degradation). Giải pháp hiện đại kết hợp:
1. **Hierarchical Memory Buffer:** Phân tầng bộ nhớ Working Memory (RAM cục bộ), Episodic Memory (Vector Store), và Semantic Memory (Graph Database).
2. **Deterministic Tool Calling:** Ràng buộc chặt chẽ Schema JSON để tránh output không xác định.

### 3. Đánh giá ROI và Khuyến nghị Triển khai
Việc áp dụng Multi-Agent giúp giảm thiểu 68% lỗi logic so với Single-Prompt LLM, đồng thời cho phép tích hợp trực tiếp vào quy trình CI/CD và giám sát vận hành thời gian thực.`,
    author: {
      name: 'TS. Nguyễn Hoàng Nam',
      role: 'Principal AI Architect tại TechVision Lab',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    publishedAt: '2026-08-19T09:30:00Z',
    readTimeMinutes: 8,
    category: 'Trí tuệ Nhân tạo',
    tags: ['AI Agents', 'LLM', 'System Architecture', 'Prompt Engineering'],
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
    views: 4520,
    likes: 382,
    isDeepAnalysis: true,
    isTrending: true,
    keyInsights: [
      'Multi-Agent giúp phân chia trách nhiệm rõ ràng giữa Planning, Execution và Reflection.',
      'Cấu trúc bộ nhớ phân tầng giảm chi phí inference và độ trễ phản hồi.',
      'Ràng buộc kiểu dữ liệu JSON Schema ngăn chặn hoàn toàn việc sinh output sai quy cách.'
    ]
  },
  {
    id: 'art-2',
    title: 'Bảo mật Zero-Trust và Mối đe dọa Điện toán Lượng tử (Post-Quantum Cryptography)',
    slug: 'zero-trust-post-quantum-cryptography',
    summary: 'Chuẩn bị hạ tầng doanh nghiệp trước thuật toán Shor: Chiến lược di chuyển thuật toán mã hóa khóa công khai sang Kyber và Dilithium theo khuyến nghị NIST.',
    content: `### Nguy cơ "Harvest Now, Decrypt Later"
Các tổ chức gián điệp mạng đang thu thập dữ liệu mã hóa lưu lượng Internet quy mô lớn nhằm giải mã trong tương lai khi máy tính lượng tử đủ số lượng qubit logic (Q-Day).

### Kiến trúc Zero-Trust kết hợp Thuật toán Hậu Lượng tử (PQC)
* **Khóa trao đổi (KEM):** Chuyển dịch từ ECDH sang ML-KEM (Kyber-768/1024).
* **Chữ ký số (Digital Signatures):** Chuyển từ RSA/ECDSA sang ML-DSA (Dilithium) và SLH-DSA (SPHINCS+).
* **Identity-First Security:** Mọi yêu cầu kết nối mạng nội bộ phải được xác thực danh tính liên tục qua mTLS và phần cứng TPM 2.0.

\`\`\`bash
# Kiểm tra hỗ trợ PQC trên OpenSSL 3.3+
openssl list -kem-algorithms | grep kyber
\`\`\`

### Lộ trình 3 bước cho Kỹ sư An ninh Mạng
1. Lập bản đồ mật mã (Cryptographic Inventory) toàn hệ thống.
2. Thiết lập cơ chế lai ghép (Hybrid Mode: ECDH + Kyber) để đảm bảo tương thích ngược.
3. Thử nghiệm áp lực tải CPU và dung lượng khóa lớn hơn gấp nhiều lần.`,
    author: {
      name: 'Lê Minh Quân',
      role: 'Head of Cybersecurity & InfoSec Lead',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    publishedAt: '2026-08-18T14:15:00Z',
    readTimeMinutes: 10,
    category: 'An ninh Mạng',
    tags: ['Zero-Trust', 'PQC', 'Cybersecurity', 'Encryption', 'NIST'],
    coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    views: 3180,
    likes: 245,
    isDeepAnalysis: true,
    isTrending: false,
    keyInsights: [
      'Kích thước khóa PQC lớn hơn đòi hỏi tối ưu MTU mạng và bộ đệm TCP.',
      'Cơ chế Hybrid Cryptography là lựa chọn chuyển đổi an toàn nhất giai đoạn 2026-2028.',
      'Zero-Trust đòi hỏi xác thực phần cứng và micro-segmentation ở tầng kernel.'
    ]
  },
  {
    id: 'art-3',
    title: 'eBPF và Cuộc Cách Mạng Giám sát Khả năng Quan sát (Observability) trong Kubernetes',
    slug: 'ebpf-kubernetes-observability-revolution',
    summary: 'Làm thế nào Extended Berkeley Packet Filter (eBPF) cho phép theo dõi kernel Linux mà không cần can thiệp mã nguồn ứng dụng hay cài đặt sidecar proxy nặng nề.',
    content: `### eBPF là gì và tại sao lại thay đổi cuộc chơi?
eBPF cho phép chạy các chương trình bytecode an toàn ngay bên trong nhân Linux Kernel mà không cần biên dịch lại kernel hay tải module ngoại vi. 

### So sánh Sidecar vs eBPF
* **Sidecar Proxy (như Envoy):** Tốn thêm tài nguyên CPU/RAM cho mỗi Pod, tăng độ trễ mạng do đi qua nhiều tầng socket.
* **eBPF-driven (như Cilium/TETRAGON):** Bắt gói tin trực tiếp tại socket layer tầng kernel, giảm 40% độ trễ network overhead.

\`\`\`c
// Trích đoạn C kernel hook eBPF bắt sự kiện TCP connect
SEC("kprobe/tcp_v4_connect")
int BPF_KPROBE(trace_connect, struct sock *sk) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    bpf_printk("TCP Connect detected from PID %d", pid);
    return 0;
}
\`\`\`

### Ứng dụng thực tế
1. **Network Security:** Tường lửa tầng L3/L4/L7 với hiệu năng phần cứng.
2. **Continuous Profiling:** Lập bản đồ sử dụng CPU/Memory flamegraph không downtime.`,
    author: {
      name: 'Trần Đăng Khoa',
      role: 'Staff DevOps & Cloud Native Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    publishedAt: '2026-08-17T11:00:00Z',
    readTimeMinutes: 7,
    category: 'Điện toán Đám mây & DevOps',
    tags: ['eBPF', 'Kubernetes', 'Linux Kernel', 'DevOps', 'Cilium'],
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    views: 2890,
    likes: 198,
    isDeepAnalysis: true,
    isTrending: true,
    keyInsights: [
      'eBPF loại bỏ hoàn toàn nhu cầu chèn sidecar containers nặng nề trong Pods.',
      'Cung cấp khả năng bảo mật runtime theo thời gian thực ở mức độ kernel events.',
      'Giảm thiểu tài nguyên phần cứng tới 30% cho các cụm Kubernetes tải cao.'
    ]
  },
  {
    id: 'art-4',
    title: 'Kiến Trúc Bán Dẫn 2nm và Bước Tiến Chiplet 3D Packaging trong Kỷ Nguyên AI Siêu Điện Toán',
    slug: 'semiconductor-2nm-chiplet-3d-packaging',
    summary: 'Tổng quan kỹ thuật về tiến trình GAAFET (Gate-All-Around), bóng bán dẫn nanosheet, công nghệ cấp nguồn mặt sau (Backside Power Delivery - BSPD) và interconnect quang học.',
    content: `### 1. Giới hạn vật lý của FinFET và sự trỗi dậy của GAA Nanosheets
Khi kích thước bóng bán dẫn tiến dần đến thang đo 2nm, hiệu ứng rò rỉ dòng điện lượng tử (Quantum Tunneling) khiến cấu trúc FinFET truyền thống không còn duy trì được tỷ lệ on/off hiệu quả. Cấu trúc Nanosheet bọc toàn diện 4 mặt kênh dẫn (Gate-All-Around) trở thành giải pháp cứu cánh.

### 2. Backside Power Delivery (BSPD)
Bằng cách tách rời mạng lưới phân phối điện năng (Power Rails) sang mặt sau của tấm wafer silicon, mặt trước chỉ tập trung cho các đường tín hiệu (Signal Interconnects), giúp giảm sụt áp IR Drop lên đến 30% và tăng tần số xung nhịp tối đa.

### 3. Chiplet và Optical Co-Packaged Optics
Thay vì sản xuất monolithic die kích thước khổng lồ có tỷ lệ lỗi cao, các vi xử lý AI hiện đại kết hợp nhiều chiplet chuyên biệt (Compute die, HBM4 memory, I/O controller) qua silicon interposer và kết nối quang học trực tiếp.`,
    author: {
      name: 'Vũ Quốc Anh',
      role: 'Hardware Systems Specialist',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    publishedAt: '2026-08-16T08:20:00Z',
    readTimeMinutes: 9,
    category: 'Phần cứng & Bán dẫn',
    tags: ['Semiconductor', 'GAAFET', 'Hardware', 'Chiplet', 'AI Compute'],
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    views: 3950,
    likes: 310,
    isDeepAnalysis: true,
    isTrending: false,
    keyInsights: [
      'GAA Nanosheet giải quyết bài toán kiểm soát dòng rò ở thang đo nguyên tử.',
      'Cấp nguồn mặt sau (BSPD) cải thiện đáng kể hiệu suất năng lượng trên mỗi watt điện.',
      'Kết nối quang học co-packaged optics mở ra băng thông terabit không sinh nhiệt.'
    ]
  },
  {
    id: 'art-5',
    title: 'WebAssembly (WASM) & Component Model: Định Hình Lại Nền Tảng Microservices & Edge Computing',
    slug: 'webassembly-component-model-microservices',
    summary: 'Tại sao WASM không chỉ dành cho trình duyệt mà đang trở thành runtime thực thi mã siêu nhẹ, khởi động mili-giây cho backend và edge cloud.',
    content: `### Khởi động trong 1 mili-giây: So sánh Docker vs WASI
Container truyền thống đòi hỏi nạp toàn bộ root filesystem, hệ điều hành con và tài nguyên kernel namespace. WebAssembly System Interface (WASI) chỉ cần nạp tệp nhị phân siêu nhỏ và chạy trực tiếp trên máy ảo JIT/AOT.

### WebAssembly Component Model (Wasm-tools)
Cho phép liên kết module viết bằng Rust, Go, Python hoặc C++ vào một chương trình duy nhất một cách an toàn mà không cần thông qua FFI phức tạp.`,
    author: {
      name: 'Phạm Thanh Thảo',
      role: 'Software Architect & Rust Specialist',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    publishedAt: '2026-08-15T16:40:00Z',
    readTimeMinutes: 6,
    category: 'Kiến trúc Phần mềm',
    tags: ['WebAssembly', 'WASI', 'Rust', 'Edge Computing', 'Microservices'],
    coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    views: 2210,
    likes: 175,
    isDeepAnalysis: false,
    isTrending: false,
    keyInsights: [
      'Thời gian khởi động dưới 1ms hoàn hảo cho Serverless Cold Start.',
      'Mô hình sandbox an toàn mặc định theo triết lý Capabilities-based Security.'
    ]
  },
  {
    id: 'art-6',
    title: 'Zero-Knowledge Rollups và Cơ Chế Đồng Thuận Chống Kiểm Duyệt Trong Web3',
    slug: 'zk-rollups-censorship-resistance-web3',
    summary: 'Tìm hiểu sâu về công nghệ ZK-SNARK, Plonky3 và cách các Layer 2 mở rộng thông lượng giao dịch blockchain lên hàng chục ngàn TPS với chi phí tối thiểu.',
    content: `### Bản chất của Zero-Knowledge Proofs (ZKP)
ZKP cho phép một bên (Prover) chứng minh cho bên khác (Verifier) rằng một phát biểu là đúng mà không tiết lộ bất kỳ thông tin nhạy cảm nào ngoài tính xác thực của phát biểu đó.

### Recursive SNARKs và Tối ưu Chi phí Xác minh
Bằng cách đóng gói nhiều bằng chứng nhỏ thành một bằng chứng tổng hợp (Recursive Proofs), dung lượng dữ liệu cần đăng tải lên Layer 1 giảm xuống đáng kể, mang lại tốc độ tức thì và phí gas gần như bằng không.`,
    author: {
      name: 'Ngô Đức Thắng',
      role: 'Cryptographic Researcher & Web3 Lead',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    publishedAt: '2026-08-14T10:15:00Z',
    readTimeMinutes: 8,
    category: 'Blockchain & Web3',
    tags: ['Web3', 'ZK-Rollup', 'Cryptography', 'SNARKs', 'Blockchain'],
    coverImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=80',
    views: 1840,
    likes: 142,
    isDeepAnalysis: false,
    isTrending: false,
    keyInsights: [
      'ZK-Rollup đem lại tính toàn vẹn toán học thay vì phụ thuộc vào giả định trung thực như Optimistic Rollup.',
      'Plonky3 giúp tốc độ sinh proof nhanh gấp 10 lần các thế hệ trước.'
    ]
  }
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'cmt-1',
    articleId: 'art-1',
    authorName: 'Hoàng Quốc Bảo',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Kỹ sư AI cấp cao',
    authorBadge: 'Chuyên gia AI',
    content: 'Bài phân tích rất thực tế! Team mình hiện đang áp dụng mô hình Planner-Executor kết hợp LangGraph, việc chia nhỏ trách nhiệm giữa các Agent thực sự đã giảm thiểu đáng kể tình trạng hallucination khi truy vấn dữ liệu tài chính nội bộ.',
    createdAt: '2026-08-19T10:15:00Z',
    likes: 24,
    isLikedByUser: false,
    replies: [
      {
        id: 'cmt-1-1',
        articleId: 'art-1',
        authorName: 'TS. Nguyễn Hoàng Nam',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        authorRole: 'Tác giả bài viết',
        authorBadge: 'Tác giả',
        content: 'Cảm ơn Bảo! Khi tích hợp dữ liệu tài chính, các bạn có bổ sung thêm Critic Agent để cross-check với SQL schema hay chạy dry-run trước khi submit transaction không?',
        createdAt: '2026-08-19T10:30:00Z',
        likes: 12,
        isLikedByUser: true
      },
      {
        id: 'cmt-1-2',
        articleId: 'art-1',
        authorName: 'Hoàng Quốc Bảo',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authorRole: 'Kỹ sư AI cấp cao',
        content: 'Có ạ, bên mình dùng một Validator Agent chạy kiểm tra Explain Plan và kiểm tra permission token trước khi query thực tế, hoạt động rất mượt.',
        createdAt: '2026-08-19T10:45:00Z',
        likes: 8
      }
    ]
  },
  {
    id: 'cmt-2',
    articleId: 'art-1',
    authorName: 'Đỗ Thùy Trang',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Product Manager',
    authorBadge: 'Thành viên Tích cực',
    content: 'Cho mình hỏi về chi phí token trung bình cho một workflow multi-agent như thế này có bị đội lên quá nhiều so với single prompt thông thường không tác giả?',
    createdAt: '2026-08-19T12:00:00Z',
    likes: 15,
    isLikedByUser: false,
    replies: [
      {
        id: 'cmt-2-1',
        articleId: 'art-1',
        authorName: 'Trần Văn Hùng',
        authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        authorRole: 'DevOps Lead',
        content: 'Theo kinh nghiệm bên mình thì token tăng khoảng 2.5 - 3 lần, tuy nhiên tỷ lệ thành công của tác vụ tăng từ 55% lên hơn 94%, nên tính về chi phí sửa lỗi và vận hành lại tiết kiệm hơn rất nhiều!',
        createdAt: '2026-08-19T13:20:00Z',
        likes: 19
      }
    ]
  },
  {
    id: 'cmt-3',
    articleId: 'art-2',
    authorName: 'Nguyễn Thành Trung',
    authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Security Analyst',
    authorBadge: 'Bảo mật',
    content: 'Các ngân hàng lớn hiện nay bắt đầu triển khai thử nghiệm ML-KEM cho các kết nối VPN site-to-site. Kích thước gói tin lớn hơn thực sự là vấn đề cần tính toán cẩn thận về MTU mạng.',
    createdAt: '2026-08-18T16:00:00Z',
    likes: 9
  }
];

export const INITIAL_EXAMS: QuizExam[] = [
  {
    id: 'exam-ai-101',
    title: 'Đánh Giá Năng Lực Kiến Trúc Sư AI & Kỹ Thuật LLM Chuyên Sâu 2026',
    description: 'Bộ đề thi chuẩn hóa kiểm tra chuyên sâu kiến thức về Multi-Agent, Prompt Engineering, Fine-tuning, RAG và tối ưu hóa chi phí mô hình ngôn ngữ lớn.',
    category: 'Trí tuệ Nhân tạo',
    difficulty: 'Nâng cao',
    durationMinutes: 20,
    passScorePercent: 75,
    createdAt: '2026-08-15T08:00:00Z',
    authorName: 'Hội đồng Khảo thí Kỹ thuật Số',
    participantsCount: 428,
    averageScore: 78.4,
    isFeatured: true,
    questions: [
      {
        id: 'q1',
        question: 'Trong kiến trúc Multi-Agent, vai trò chính của thành phần "Critic / Reflection Agent" là gì?',
        options: [
          { id: 'A', text: 'Thực thi câu lệnh SQL trực tiếp vào cơ sở dữ liệu' },
          { id: 'B', text: 'Thẩm định, phát hiện lỗi logic và đánh giá tính an toàn của kết quả trước khi trả về' },
          { id: 'C', text: 'Tạo mã nhị phân WebAssembly' },
          { id: 'D', text: 'Quản lý kết nối WebSocket đến máy khách' }
        ],
        correctOptionId: 'B',
        explanation: 'Critic/Reflection Agent chịu trách nhiệm rà soát lại output của các Executor Agent, đối chiếu với tiêu chí an toàn và logic để đảm bảo không có sai sót trước khi tổng hợp kết quả.',
        difficulty: 'Dễ',
        topic: 'AI Agents'
      },
      {
        id: 'q2',
        question: 'Quan sát đoạn mã cấu hình gọi Gemini API sau, đoạn mã nào là ĐÚNG chuẩn để định dạng kết quả trả về dạng JSON có cấu trúc?',
        codeSnippet: `// Đoạn mã cần hoàn thiện
const response = await ai.models.generateContent({
  model: 'gemini-3.7-flash',
  contents: 'Liệt kê các bước triển khai Zero-Trust',
  config: {
    // ??? Cấu hình chuẩn ở đây
  }
});`,
        codeLanguage: 'typescript',
        options: [
          { id: 'A', text: 'responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { ... } }' },
          { id: 'B', text: 'outputFormat: "json", schemaType: SchemaType.ARRAY' },
          { id: 'C', text: 'forceJson: true, returnFormat: "raw_json"' },
          { id: 'D', text: 'generationConfig: { jsonMode: true }' }
        ],
        correctOptionId: 'A',
        explanation: 'Theo SDK @google/genai chuẩn hiện đại, ta sử dụng responseMimeType: "application/json" cùng responseSchema kết hợp kiểu enum Type từ thư viện.',
        difficulty: 'Trung bình',
        topic: 'Gemini SDK'
      },
      {
        id: 'q3',
        question: 'Kỹ thuật RAG (Retrieval-Augmented Generation) phân cấp (Hierarchical RAG) giải quyết vấn đề cốt lõi nào?',
        options: [
          { id: 'A', text: 'Tăng tốc độ hiển thị hình ảnh 4K' },
          { id: 'B', text: 'Duy trì ngữ cảnh tổng thể ở cấp tài liệu lớn trong khi vẫn truy xuất chính xác đoạn văn bản chi tiết' },
          { id: 'C', text: 'Thay thế hoàn toàn nhu cầu dùng Vector Database' },
          { id: 'D', text: 'Chuyển đổi token sang mã máy nhị phân' }
        ],
        correctOptionId: 'B',
        explanation: 'Hierarchical RAG tạo chỉ mục tóm tắt ở cấp độ tài liệu/chương mục kết hợp vector chunk cấp đoạn văn, giúp mô hình không bị mất bức tranh toàn cảnh khi tra cứu.',
        difficulty: 'Khó',
        topic: 'RAG & Search'
      },
      {
        id: 'q4',
        question: 'Tại sao việc gán User-Agent: "aistudio-build" trong httpOptions khi khởi tạo GoogleGenAI là bắt buộc theo quy chuẩn?',
        codeSnippet: `const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});`,
        codeLanguage: 'typescript',
        options: [
          { id: 'A', text: 'Để vượt qua tường lửa CAPTCHA' },
          { id: 'B', text: 'Để phục vụ mục đích đo lường (telemetry) và định tuyến hệ thống chuẩn hóa của AI Studio' },
          { id: 'C', text: 'Để giảm 50% chi phí hóa đơn token' },
          { id: 'D', text: 'Để ép buộc mô hình chỉ trả về tiếng Việt' }
        ],
        correctOptionId: 'B',
        explanation: 'Header User-Agent: aistudio-build là yêu cầu bắt buộc để nền tảng AI Studio giám sát, phục vụ telemetry và bảo đảm kết nối tối ưu.',
        difficulty: 'Dễ',
        topic: 'System Guidelines'
      },
      {
        id: 'q5',
        question: 'Mô hình suy luận (Thinking Model) kiểm soát mức độ suy luận thông qua tham số nào trong SDK?',
        options: [
          { id: 'A', text: 'thinkTimeInSeconds: 30' },
          { id: 'B', text: 'config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW / HIGH } }' },
          { id: 'C', text: 'reasoningStepCount: 5' },
          { id: 'D', text: 'ai.enableDeepThinking(true)' }
        ],
        correctOptionId: 'B',
        explanation: 'Đối với các mô hình Gemini 3, tham số thinkingConfig với thinkingLevel (như ThinkingLevel.LOW hoặc ThinkingLevel.HIGH) điều chỉnh mức độ suy luận trước khi trả lời.',
        difficulty: 'Trung bình',
        topic: 'Model Reasoning'
      }
    ]
  },
  {
    id: 'exam-sec-202',
    title: 'Khảo Sát Chuyên Sâu: An Toàn Thông Tin & Kiến Trúc Zero-Trust 2026',
    description: 'Kiểm tra năng lực phòng thủ mạng, mã hóa hậu lượng tử (PQC), quản lý định danh IAM và bảo mật ứng dụng Cloud-Native.',
    category: 'An ninh Mạng',
    difficulty: 'Chuyên gia',
    durationMinutes: 15,
    passScorePercent: 80,
    createdAt: '2026-08-14T10:00:00Z',
    authorName: 'Trung tâm Nghiên cứu An ninh Mạng',
    participantsCount: 312,
    averageScore: 72.1,
    isFeatured: true,
    questions: [
      {
        id: 'sec-q1',
        question: 'Nguyên lý cốt lõi của mô hình bảo mật Zero-Trust là gì?',
        options: [
          { id: 'A', text: 'Tin cậy tuyệt đối mọi thiết bị nằm trong mạng nội bộ LAN' },
          { id: 'B', text: 'Không bao giờ tin tưởng, luôn luôn xác thực (Never Trust, Always Verify)' },
          { id: 'C', text: 'Chỉ cài đặt phần mềm diệt virus trên máy chủ chính' },
          { id: 'D', text: 'Tắt toàn bộ cổng kết nối Internet' }
        ],
        correctOptionId: 'B',
        explanation: 'Zero-Trust giả định rằng mạng nội bộ luôn có thể đã bị xâm nhập, do đó mọi yêu cầu truy cập tài nguyên đều phải được xác minh danh tính, ngữ cảnh và cấp quyền tối thiểu.',
        difficulty: 'Dễ',
        topic: 'Zero-Trust'
      },
      {
        id: 'sec-q2',
        question: 'Thuật toán mã hóa khóa công khai nào sau đây được NIST chuẩn hóa cho Post-Quantum Cryptography (PQC) để thay thế RSA/ECDH?',
        options: [
          { id: 'A', text: 'DES & 3DES' },
          { id: 'B', text: 'ML-KEM (trước đây là Kyber)' },
          { id: 'C', text: 'MD5 & SHA-1' },
          { id: 'D', text: 'RC4' }
        ],
        correctOptionId: 'B',
        explanation: 'ML-KEM (dựa trên thuật toán Kyber) đã được NIST chuẩn hóa chính thức thành chuẩn FIPS 203 cho cơ chế đóng gói khóa hậu lượng tử.',
        difficulty: 'Khó',
        topic: 'PQC'
      },
      {
        id: 'sec-q3',
        question: 'Tấn công "Harvest Now, Decrypt Later" gây nguy cơ trực tiếp nhất cho loại dữ liệu nào?',
        options: [
          { id: 'A', text: 'Hình ảnh meme công khai trên mạng xã hội' },
          { id: 'B', text: 'Dữ liệu nhạy cảm có vòng đời bảo mật dài hạn (hồ sơ y tế, bí mật quốc gia, sở hữu trí tuệ)' },
          { id: 'C', text: 'Mã OTP có thời hạn 30 giây' },
          { id: 'D', text: 'Bộ đệm video streaming trực tiếp' }
        ],
        correctOptionId: 'B',
        explanation: 'Kẻ tấn công lưu trữ dữ liệu mã hóa hiện tại để chờ khi máy tính lượng tử đủ mạnh trong tương lai giải mã. Các dữ liệu có giá trị lâu dài chịu rủi ro cao nhất.',
        difficulty: 'Trung bình',
        topic: 'Quantum Threats'
      },
      {
        id: 'sec-q4',
        question: 'Cơ chế mTLS (Mutual TLS) trong kiến trúc Service Mesh đóng vai trò gì?',
        options: [
          { id: 'A', text: 'Chỉ mã hóa từ người dùng tới Load Balancer' },
          { id: 'B', text: 'Xác thực hai chiều và mã hóa toàn bộ lưu lượng liên lạc giữa các microservice với nhau' },
          { id: 'C', text: 'Tự động sao lưu cơ sở dữ liệu hàng ngày' },
          { id: 'D', text: 'Nén dung lượng ảnh PNG' }
        ],
        correctOptionId: 'B',
        explanation: 'mTLS đảm bảo cả client và server trong cụm microservice đều phải xuất trình chứng chỉ số hợp lệ để xác thực lẫn nhau và mã hóa đường truyền.',
        difficulty: 'Trung bình',
        topic: 'Microservices Security'
      }
    ]
  },
  {
    id: 'exam-dev-303',
    title: 'Kiểm Tra Chuẩn Lập Trình TypeScript 5.8 & React 19 Hiện Đại',
    description: 'Đánh giá kiến thức về Server Actions, Compiler, Type Narrowing, Custom Hooks và Tối ưu hóa hiệu năng render.',
    category: 'Kiến trúc Phần mềm',
    difficulty: 'Trung bình',
    durationMinutes: 15,
    passScorePercent: 70,
    createdAt: '2026-08-12T14:00:00Z',
    authorName: 'Cộng đồng Frontend Vietnam',
    participantsCount: 580,
    averageScore: 81.2,
    isFeatured: true,
    questions: [
      {
        id: 'ts-q1',
        question: 'Trong TypeScript, điều gì xảy ra khi sử dụng type "never"?',
        options: [
          { id: 'A', text: 'Biến có thể nhận bất kỳ giá trị nào' },
          { id: 'B', text: 'Đại diện cho tập hợp rỗng, không có giá trị nào có thể gán cho kiểu này (thường dùng trong Exhaustive Check)' },
          { id: 'C', text: 'Tương đương với void hoặc undefined' },
          { id: 'D', text: 'Ép kiểu ngầm định về số nguyên' }
        ],
        correctOptionId: 'B',
        explanation: 'Kiểu never đại diện cho giá trị không bao giờ xảy ra, cực kỳ hữu ích trong switch-case exhaustive checking để bắt lỗi khi thiếu nhánh xử lý.',
        difficulty: 'Dễ',
        topic: 'TypeScript Core'
      },
      {
        id: 'ts-q2',
        question: 'Tại sao React 19 và React Compiler giảm bớt sự cần thiết của useMemo và useCallback thủ công?',
        options: [
          { id: 'A', text: 'Vì JavaScript đã cấm sử dụng mảng' },
          { id: 'B', text: 'Vì React Compiler tự động phân tích luồng dữ liệu tĩnh và tối ưu memoization ở cấp độ build time' },
          { id: 'C', text: 'Vì useMemo gây rò rỉ bộ nhớ vĩnh viễn' },
          { id: 'D', text: 'Vì React 19 chuyển sang sử dụng Virtual DOM bằng C++' }
        ],
        correctOptionId: 'B',
        explanation: 'React Compiler (Forget) tự động thêm cơ chế ghi nhớ các giá trị và hàm phụ thuộc một cách tự động, giúp mã nguồn sạch hơn mà vẫn tối ưu render.',
        difficulty: 'Trung bình',
        topic: 'React 19'
      },
      {
        id: 'ts-q3',
        question: 'Quy tắc vàng về "useEffect Dependency Array" để tránh Infinite Loop trong React là gì?',
        options: [
          { id: 'A', text: 'Luôn đưa hàm mới tạo trong thân component vào dependency array mà không cần memo' },
          { id: 'B', text: 'Tránh cập nhật state trực tiếp kích hoạt re-render chính nó và ưu tiên dùng primitive types (string, number, boolean) trong dependency array' },
          { id: 'C', text: 'Không bao giờ được sử dụng useEffect' },
          { id: 'D', text: 'Luôn đặt dependency array là [Math.random()]' }
        ],
        correctOptionId: 'B',
        explanation: 'Các object hoặc array tạo mới mỗi lần render sẽ có địa chỉ tham chiếu mới, đưa vào useEffect sẽ kích hoạt chạy lại liên tục gây vòng lặp vô tận.',
        difficulty: 'Dễ',
        topic: 'React Hooks'
      }
    ]
  }
];

export const INITIAL_ATTEMPTS: ExamAttempt[] = [
  {
    id: 'att-101',
    examId: 'exam-ai-101',
    examTitle: 'Đánh Giá Năng Lực Kiến Trúc Sư AI & Kỹ Thuật LLM Chuyên Sâu 2026',
    userId: 'user-default',
    userName: 'Đặng Tuấn Anh',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    userRole: 'Kỹ sư Phần mềm',
    score: 5,
    maxScore: 5,
    percentage: 100,
    passed: true,
    startedAt: '2026-08-19T08:00:00Z',
    completedAt: '2026-08-19T08:14:20Z',
    durationSeconds: 860,
    answers: [
      { questionId: 'q1', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'q2', selectedOptionId: 'A', isCorrect: true },
      { questionId: 'q3', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'q4', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'q5', selectedOptionId: 'B', isCorrect: true }
    ],
    flaggedQuestions: []
  },
  {
    id: 'att-102',
    examId: 'exam-sec-202',
    examTitle: 'Khảo Sát Chuyên Sâu: An Toàn Thông Tin & Kiến Trúc Zero-Trust 2026',
    userId: 'user-2',
    userName: 'Nguyễn Thị Mai',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    userRole: 'Security Engineer',
    score: 3,
    maxScore: 4,
    percentage: 75,
    passed: false,
    startedAt: '2026-08-18T15:00:00Z',
    completedAt: '2026-08-18T15:12:45Z',
    durationSeconds: 765,
    answers: [
      { questionId: 'sec-q1', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'sec-q2', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'sec-q3', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'sec-q4', selectedOptionId: 'A', isCorrect: false }
    ],
    flaggedQuestions: ['sec-q4']
  },
  {
    id: 'att-103',
    examId: 'exam-dev-303',
    examTitle: 'Kiểm Tra Chuẩn Lập Trình TypeScript 5.8 & React 19 Hiện Đại',
    userId: 'user-3',
    userName: 'Lê Hoàng Long',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    userRole: 'Frontend Developer',
    score: 3,
    maxScore: 3,
    percentage: 100,
    passed: true,
    startedAt: '2026-08-17T09:30:00Z',
    completedAt: '2026-08-17T09:39:10Z',
    durationSeconds: 550,
    answers: [
      { questionId: 'ts-q1', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'ts-q2', selectedOptionId: 'B', isCorrect: true },
      { questionId: 'ts-q3', selectedOptionId: 'B', isCorrect: true }
    ],
    flaggedQuestions: []
  }
];

export const SOFTWARE_UTILITIES: SoftwareUtility[] = [
  {
    id: 'util-url-scanner',
    name: 'Trình Phân Tích & Kiểm Tra An Toàn URL',
    slug: 'url-security-scanner',
    category: 'An ninh Mạng',
    icon: 'Globe',
    shortDesc: 'Nhập một đường dẫn (URL) bất kỳ để phân tích máy chủ đích, chứng chỉ bảo mật và các dấu hiệu lừa đảo (phishing) tiềm ẩn.',
    detailedDesc: 'Công cụ phân giải tên miền thực tế phía máy chủ (DNS), kiểm tra chuỗi chuyển hướng, chứng chỉ SSL/TLS và đối chiếu với các mẫu hành vi lừa đảo phổ biến (giả mạo thương hiệu, tên miền rút gọn, Punycode, IP trực tiếp...) để đưa ra cảnh báo mức độ rủi ro tham khảo.',
    badge: 'Mới',
    features: [
      'Phân giải DNS để xác định địa chỉ IP máy chủ thực sự đang lưu trữ đường dẫn',
      'Theo dõi toàn bộ chuỗi chuyển hướng (redirect chain) đến đích cuối cùng',
      'Kiểm tra chứng chỉ SSL/TLS: tổ chức phát hành, thời hạn hiệu lực, tính hợp lệ',
      'Chấm điểm rủi ro tự động dựa trên các dấu hiệu giả mạo thương hiệu, IP nội bộ, Punycode, tên miền rút gọn, TLD đáng ngờ...'
    ],
    useCases: [
      'Kiểm tra liên kết lạ nhận được qua tin nhắn, email hoặc mạng xã hội trước khi bấm vào',
      'Xác minh đường dẫn giả danh ngân hàng, ví điện tử (Vietcombank, MoMo, Zalo...) trước khi đăng nhập',
      'Rà soát nhanh các liên kết rút gọn không rõ nguồn gốc'
    ],
    guides: [
      {
        step: 1,
        title: 'Nhập đường dẫn cần kiểm tra',
        instruction: 'Dán URL đầy đủ (hoặc chỉ tên miền) vào ô nhập liệu, ví dụ: vietcombank-verify.tk hoặc https://example.com/login.'
      },
      {
        step: 2,
        title: 'Nhấn Phân Tích và chờ kết quả',
        instruction: 'Hệ thống sẽ phân giải DNS, kết nối thử tới máy chủ đích và kiểm tra chứng chỉ bảo mật trong vài giây.'
      },
      {
        step: 3,
        title: 'Đọc kết quả và mức độ rủi ro',
        instruction: 'Xem điểm rủi ro, danh sách lý do cụ thể và kết luận (An toàn / Cần thận trọng / Nguy hiểm) để quyết định có nên truy cập tiếp hay không.',
        tip: 'Đây là công cụ phân tích tham khảo dựa trên heuristic, không thay thế hoàn toàn các dịch vụ chuyên biệt như Google Safe Browsing. Luôn thận trọng khi nhập thông tin tài khoản, mật khẩu.'
      }
    ]
  },
  {
    id: 'util-pass-gen',
    name: 'Trình Tạo Mật Khẩu Mạnh & Token Bảo Mật',
    slug: 'password-token-generator',
    category: 'Bảo mật & Mã hoá',
    icon: 'KeyRound',
    shortDesc: 'Tạo mật khẩu ngẫu nhiên độ an toàn cao, API secret key, UUID v4, hoặc kiểm tra độ mạnh/yếu của một mật khẩu bạn đã có.',
    detailedDesc: 'Sử dụng bộ sinh số ngẫu nhiên mật mã (Web Crypto API CSPRNG) đảm bảo mật khẩu và token không thể đoán trước, phòng chống tấn công brute-force và từ điển. Ngoài chế độ tạo mới, công cụ còn có chế độ "Kiểm tra mật khẩu" để đánh giá ngay một mật khẩu bạn đang dùng.',
    badge: 'Bảo mật cao',
    features: [
      'Sinh mật khẩu tùy biến: chữ hoa, chữ thường, số, ký tự đặc biệt',
      'Sinh chuỗi Hex, Base64 Token, UUID v4 ngẫu nhiên',
      'Chế độ "Kiểm tra mật khẩu": nhập mật khẩu bất kỳ để chấm điểm Entropy, phát hiện mật khẩu phổ biến/dễ đoán và ước tính thời gian bị dò ra',
      '100% xử lý cục bộ trên trình duyệt, không gửi dữ liệu qua mạng — kể cả khi kiểm tra mật khẩu đã có'
    ],
    useCases: [
      'Tạo Secret Key an toàn cho JWT, Webhook, API Gateway',
      'Tạo mật khẩu quản trị cơ sở dữ liệu và máy chủ Linux',
      'Kiểm tra nhanh mật khẩu cá nhân/công ty đang dùng có đủ mạnh hay nằm trong danh sách dễ đoán không'
    ],
    guides: [
      {
        step: 1,
        title: 'Chọn chế độ Tạo mật khẩu hoặc Kiểm tra mật khẩu',
        instruction: 'Dùng tab "Tạo mật khẩu" để sinh chuỗi ngẫu nhiên mới, hoặc tab "Kiểm tra mật khẩu" để đánh giá một mật khẩu bạn đã có sẵn.'
      },
      {
        step: 2,
        title: 'Tạo mới: thiết lập độ dài và bộ ký tự',
        instruction: 'Kéo thanh trượt để chọn độ dài (khuyến nghị từ 16 ký tự trở lên) và tích chọn các nhóm ký tự mong muốn, sau đó quan sát thanh đo Entropy (Rất mạnh > 90 bits).'
      },
      {
        step: 3,
        title: 'Kiểm tra: nhập mật khẩu cần đánh giá',
        instruction: 'Gõ hoặc dán mật khẩu vào ô nhập liệu (có thể bấm biểu tượng mắt để hiện/ẩn). Kết quả đánh giá — mức độ mạnh yếu, thời gian ước tính bị dò ra và các điểm yếu cụ thể — hiện ra ngay lập tức, xử lý hoàn toàn trên trình duyệt.',
        tip: 'Không nên nhập mật khẩu đang dùng cho tài khoản quan trọng vào bất kỳ công cụ online nào (kể cả công cụ này) nếu bạn không chắc nó xử lý cục bộ. Tốt nhất nên đổi mật khẩu ngay sau khi kiểm tra nếu phát hiện điểm yếu.'
      },
      {
        step: 4,
        title: 'Sao chép an toàn',
        instruction: 'Nhấn nút sao chép với mật khẩu vừa tạo. Khuyến khích lưu trữ mật khẩu trong Password Manager chuyên dụng.'
      }
    ]
  },
  {
    id: 'util-code-formatter',
    name: 'Trình Định Dạng & Làm Đẹp Mã Nguồn (Code Formatter)',
    slug: 'code-formatter',
    category: 'Lập trình & Mã nguồn',
    icon: 'Code2',
    shortDesc: 'Chuẩn hóa định dạng, thụt dòng tab/space, làm đẹp hoặc nén tối ưu dung lượng cho JSON, JavaScript, TypeScript, HTML, CSS và SQL.',
    detailedDesc: 'Công cụ giúp lập trình viên nhanh chóng chuẩn hóa cú pháp mã nguồn, phát hiện dấu ngoặc đóng mở thiếu sót, chuyển đổi qua lại giữa định dạng đẹp mắt (Prettify) và nén thu gọn (Minify) để giảm tải băng thông tải trang.',
    badge: 'Phổ biến nhất',
    features: [
      'Hỗ trợ đa ngôn ngữ: JSON, JavaScript, TypeScript, HTML, CSS, SQL',
      'Tùy chỉnh khoảng thụt dòng (2 spaces, 4 spaces, Tab)',
      'Chế độ Minify loại bỏ toàn bộ khoảng trắng và chú thích thừa',
      'Sao chép 1-click hoặc tải về tệp nguồn đã định dạng'
    ],
    useCases: [
      'Format nhanh response JSON trả về từ REST API',
      'Làm đẹp các đoạn mã SQL truy vấn phức tạp để dễ review',
      'Nén mã CSS/JS trước khi nhúng vào email template hoặc static page'
    ],
    guides: [
      {
        step: 1,
        title: 'Dán đoạn mã cần xử lý',
        instruction: 'Nhập hoặc dán mã nguồn vào khung biên tập bên trái. Bạn cũng có thể chọn tệp từ máy tính.',
        tip: 'Đối với JSON, công cụ sẽ tự động kiểm tra tính hợp lệ cú pháp trước khi format.'
      },
      {
        step: 2,
        title: 'Lựa chọn ngôn ngữ và chế độ',
        instruction: 'Chọn đúng ngôn ngữ nguồn từ danh sách (JSON, JS/TS, SQL, HTML, CSS) và chọn chế độ Làm đẹp (Format) hoặc Nén (Minify).',
        exampleSnippet: '// Chọn 2 spaces cho chuẩn web hiện đại'
      },
      {
        step: 3,
        title: 'Xem kết quả và sao chép',
        instruction: 'Kết quả định dạng chuẩn sẽ hiển thị ngay lập tức ở khung bên phải với màu cú pháp rõ ràng. Nhấn nút "Sao chép" để sử dụng.'
      }
    ],
    keyShortcuts: [
      { key: 'Ctrl + Enter', action: 'Kích hoạt Định dạng nhanh' },
      { key: 'Ctrl + Shift + C', action: 'Sao chép toàn bộ kết quả' }
    ]
  },
  {
    id: 'util-regex-tester',
    name: 'Phòng Thí Nghiệm Biểu Thức Chính Quy (Regex Sandbox)',
    slug: 'regex-sandbox',
    category: 'Lập trình & Mã nguồn',
    icon: 'Terminal',
    shortDesc: 'Kiểm tra, phân tích và highlight trực quan các chuỗi khớp Regex trong thời gian thực kèm bảng giải thích cú pháp chi tiết.',
    detailedDesc: 'Trình kiểm tra biểu thức chính quy mạnh mẽ hỗ trợ đầy đủ các cờ (flags) g (global), i (case-insensitive), m (multiline), s (dotAll) cùng danh mục mẫu Regex thực tế thường gặp (Email, Phone VN, URL, IPv4, UUID, Mật khẩu mạnh).',
    badge: 'Mạnh mẽ',
    features: [
      'Highlight vị trí các đoạn chuỗi khớp (Matches) theo thời gian thực',
      'Trích xuất danh sách Capture Groups chi tiết',
      'Thư viện mẫu Regex chuẩn hóa (Email, SĐT Việt Nam, IPv4, Token)',
      'Tạo sẵn đoạn mã JavaScript/Python tương ứng'
    ],
    useCases: [
      'Kiểm tra tính hợp lệ của Form nhập liệu phía Client & Server',
      'Trích xuất dữ liệu hàng loạt từ tệp Log hệ thống',
      'Tìm và thay thế chuỗi ký tự phức tạp trong văn bản'
    ],
    guides: [
      {
        step: 1,
        title: 'Nhập Regular Expression Pattern',
        instruction: 'Nhập biểu thức chính quy vào ô Regex (ví dụ: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$ để kiểm tra Email).'
      },
      {
        step: 2,
        title: 'Thiết lập các cờ (Flags)',
        instruction: 'Bật tắt các cờ phù hợp: "g" để tìm tất cả các kết quả, "i" để không phân biệt hoa thường, "m" cho văn bản nhiều dòng.'
      },
      {
        step: 3,
        title: 'Dán chuỗi văn bản kiểm thử (Test String)',
        instruction: 'Nhập văn bản mẫu vào vùng kiểm tra. Các đoạn văn bản khớp sẽ được tô sáng kèm số lượng kết quả và nhóm trích xuất.'
      }
    ]
  },
  {
    id: 'util-encoder-hash',
    name: 'Bộ Mã Hóa & Băm Mật Mã (Base64, URL, SHA-256, MD5)',
    slug: 'encoder-hash-suite',
    category: 'Bảo mật & Mã hoá',
    icon: 'ShieldCheck',
    shortDesc: 'Mã hóa/Giải mã Base64, URL encode, sinh mã băm SHA-256, SHA-512, MD5 phục vụ xác thực bảo mật và lập trình API.',
    detailedDesc: 'Hỗ trợ chuyển đổi văn bản, chuỗi JSON hoặc file nhị phân sang định dạng an toàn truyền qua mạng (URL-safe Base64, UTF-8 Percent Encoding) và tính toán mã kiểm tra tính toàn vẹn (Checksum Hash) tức thì.',
    badge: 'Thiết yếu',
    features: [
      'Base64 Encode & Decode (Hỗ trợ tiếng Việt Unicode UTF-8 chuẩn xác)',
      'URL Component Encode & Decode (Xử lý query params an toàn)',
      'Mã băm mật mã chuẩn: SHA-256, SHA-512, MD5 Checksum',
      'Tính toán độ dài ký tự và dung lượng byte thực tế'
    ],
    useCases: [
      'Tạo chuỗi Base64 cho Authorization Header (Basic Auth)',
      'Kiểm tra mã băm SHA256 của tệp để bảo đảm tính toàn vẹn',
      'Encode tham số tiếng Việt trên đường dẫn URL trình duyệt'
    ],
    guides: [
      {
        step: 1,
        title: 'Chọn phép biến đổi',
        instruction: 'Lựa chọn tab công cụ: Base64, URL Encode hoặc Thuật toán Băm (SHA-256 / MD5).'
      },
      {
        step: 2,
        title: 'Nhập chuỗi nguồn',
        instruction: 'Dán chuỗi văn bản cần xử lý. Hệ thống tự động tính toán mã hóa hoặc băm trong mili-giây.'
      },
      {
        step: 3,
        title: 'Sử dụng kết quả',
        instruction: 'Sao chép chuỗi mã hóa hoặc lưu lại mã băm để so sánh xác thực.'
      }
    ]
  },
  {
    id: 'util-subnet-calc',
    name: 'Máy Tính Mạng Con & CIDR (Subnet & IP Calculator)',
    slug: 'subnet-calculator',
    category: 'Mạng & Hạ tầng',
    icon: 'Network',
    shortDesc: 'Tính toán dải địa chỉ IP, Subnet Mask, Network Address, Broadcast Address và số lượng host khả dụng theo ký hiệu CIDR.',
    detailedDesc: 'Công cụ không thể thiếu cho Kỹ sư Mạng và Cloud/DevOps khi thiết kế dải mạng VPC trên AWS, Google Cloud, Azure hoặc phân chia mạng LAN doanh nghiệp.',
    badge: 'DevOps Tool',
    features: [
      'Tính toán tức thời từ ký hiệu CIDR (ví dụ: 192.168.1.0/24 hoặc 10.0.0.0/16)',
      'Biểu diễn dạng nhị phân 32-bit trực quan',
      'Xác định IP đầu - cuối khả dụng (Usable Host Range)',
      'Phân loại lớp mạng (Class A, B, C) và loại IP (Private/Public RFC 1918)'
    ],
    useCases: [
      'Thiết kế subnetting cho cụm Kubernetes Pod CIDR',
      'Quy hoạch mạng VPC nội bộ cho hệ thống Microservices',
      'Cấu hình Firewall và ACL Rules an toàn'
    ],
    guides: [
      {
        step: 1,
        title: 'Nhập địa chỉ IP và tiền tố CIDR',
        instruction: 'Nhập địa chỉ IPv4 và chọn độ dài subnet mask (từ /8 đến /32).'
      },
      {
        step: 2,
        title: 'Phân tích bảng kết quả mạng con',
        instruction: 'Quan sát chi tiết: Địa chỉ mạng, Broadcast, Dải IP cho máy trạm, Tổng số host và Biểu diễn nhị phân.'
      }
    ]
  },
  {
    id: 'util-markdown-editor',
    name: 'Trình Soạn Thảo & Xem Trước Markdown Trực Quan',
    slug: 'markdown-previewer',
    category: 'Nội dung & Tài liệu',
    icon: 'FileText',
    shortDesc: 'Biên soạn tài liệu kỹ thuật, README.md, bài viết công nghệ với xem trước thời gian thực, bảng biểu, danh sách và khối mã.',
    detailedDesc: 'Hỗ trợ toàn diện cú pháp GitHub Flavored Markdown (GFM), chèn bảng, danh sách việc cần làm (Task lists), khối mã nguồn, và xuất nhanh sang HTML hoặc định dạng in ấn.',
    badge: 'Tài liệu',
    features: [
      'Xem trước song song (Live Split Preview) mượt mà',
      'Hỗ trợ Markdown chuẩn GFM, Table, Checklist, Blockquote',
      'Đếm số từ, số ký tự và thời gian đọc ước tính',
      'Xuất nhanh mã HTML hoặc sao chép nội dung chuẩn'
    ],
    useCases: [
      'Viết tệp README.md cho dự án GitHub / GitLab',
      'Soạn thảo tài liệu API và hướng dẫn kỹ thuật cho team',
      'Chuẩn bị bài viết blog công nghệ trước khi đăng tải'
    ],
    guides: [
      {
        step: 1,
        title: 'Soạn thảo nội dung ở khung bên trái',
        instruction: 'Sử dụng các cú pháp Markdown tiêu chuẩn như # Tiêu đề, **in đậm**, *in nghiêng*, `inline code`.'
      },
      {
        step: 2,
        title: 'Quan sát bản xem trước',
        instruction: 'Khung bên phải hiển thị giao diện render đẹp mắt theo thời gian thực với độ chính xác cao.'
      }
    ]
  },
  {
    id: 'util-sci-calculator',
    name: 'Máy Tính Khoa Học Trực Tuyến (Scientific Calculator)',
    slug: 'scientific-calculator',
    category: 'Toán học & Khoa học',
    icon: 'Calculator',
    shortDesc: 'Mô phỏng đầy đủ chức năng của máy tính bỏ túi khoa học: lượng giác, logarit, căn bậc hai/ba, lũy thừa, giai thừa, bộ nhớ M+/M-/MR/MC và chế độ góc Độ/Radian.',
    detailedDesc: 'Tái hiện trải nghiệm của các dòng máy tính khoa học phổ biến (Casio fx-570ES/991ES...) ngay trên trình duyệt: nhập biểu thức tự do hoặc bấm phím, xem trước kết quả theo thời gian thực, lưu lịch sử phép tính và chuyển đổi linh hoạt giữa độ (DEG) và radian (RAD).',
    badge: 'Mới',
    features: [
      'Đầy đủ hàm lượng giác thuận/ngược (sin, cos, tan, sin⁻¹, cos⁻¹, tan⁻¹) và hyperbolic (sinh, cosh, tanh)',
      'Logarit thập phân (log), logarit tự nhiên (ln), lũy thừa (xʸ, x², x³, x⁻¹, 10ˣ, eˣ), căn bậc hai/ba, giai thừa (x!), trị tuyệt đối (|x|)',
      'Bộ nhớ độc lập STO/M+/M-/MR/MC và phím Ans lấy lại kết quả gần nhất',
      'Phím S⇔D chuyển đổi kết quả qua lại giữa dạng thập phân và phân số tối giản gần đúng',
      'Xem nhanh kết quả dưới dạng Thập phân/Nhị phân/Bát phân/Thập lục phân (DEC/BIN/OCT/HEX) với số nguyên không âm',
      'Chuyển đổi tức thời giữa chế độ Độ (DEG) và Radian (RAD), xem trước kết quả khi đang nhập, lưu lịch sử phép tính gần đây',
      'Giải nhanh phương trình bậc hai (ax² + bx + c = 0): nhập hệ số a, b, c để ra nghiệm thực hoặc nghiệm phức kèm giá trị Δ'
    ],
    useCases: [
      'Tính toán lượng giác, logarit nhanh khi học tập hoặc làm bài tập kỹ thuật',
      'Kiểm tra nhanh công thức toán học khi không có máy tính vật lý bên cạnh',
      'Tính lãi suất, hàm mũ, căn bậc trong các bài toán tài chính/kỹ thuật cơ bản',
      'Đổi nhanh một số nguyên sang hệ Nhị phân/Bát phân/Thập lục phân khi lập trình',
      'Giải bài tập phương trình bậc hai mà không cần tự tính tay công thức nghiệm'
    ],
    guides: [
      {
        step: 1,
        title: 'Nhập biểu thức bằng phím bấm hoặc gõ trực tiếp',
        instruction: 'Bấm các phím số/hàm để dựng biểu thức, hoặc gõ trực tiếp vào ô hiển thị (ví dụ: sin(30)+2^3). Kết quả xem trước hiển thị ngay bên dưới khi biểu thức hợp lệ.'
      },
      {
        step: 2,
        title: 'Chọn chế độ góc phù hợp',
        instruction: 'Bấm nút DEG/RAD ở hàng điều khiển để chuyển đổi giữa Độ và Radian trước khi tính các hàm lượng giác.'
      },
      {
        step: 3,
        title: 'Dùng bộ nhớ và lịch sử',
        instruction: 'Bấm STO để ghi đè giá trị hiện tại vào bộ nhớ, M+/M- để cộng/trừ dồn, MR để gọi lại, MC để xóa bộ nhớ. Nhấn vào một dòng trong lịch sử để dùng lại kết quả đó.',
        tip: 'Phím "%" chia giá trị liền trước cho 100 theo kiểu đơn giản, không tính phần trăm theo ngữ cảnh như một số máy tính vật lý.'
      },
      {
        step: 4,
        title: 'Chuyển đổi phân số và hệ đếm',
        instruction: 'Sau khi nhấn "=", bấm S⇔D để xem kết quả dưới dạng phân số tối giản gần đúng (bấm lại để quay về thập phân). Bấm HEX/OCT/BIN để xem kết quả nguyên không âm gần nhất ở hệ thập lục phân/bát phân/nhị phân; bấm lại nút đó để ẩn đi.'
      },
      {
        step: 5,
        title: 'Giải phương trình bậc hai',
        instruction: 'Kéo xuống khối "Giải phương trình bậc hai" ở cuối, nhập hệ số a, b, c rồi bấm "Giải phương trình". Kết quả hiển thị giá trị Δ và nghiệm tương ứng (hai nghiệm thực, nghiệm kép, hoặc hai nghiệm phức nếu Δ âm).',
        tip: 'Đây là công thức nghiệm đóng cho riêng phương trình bậc hai, khác với chức năng SOLVE tổng quát trên máy tính vật lý (giải mọi phương trình bằng phương pháp lặp) — công cụ hiện chưa hỗ trợ SOLVE tổng quát.'
      }
    ]
  }
];
