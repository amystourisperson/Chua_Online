# Chùa An Nhiên

Bản thử web chùa Việt 3D, React + Three.js + Colyseus. Không cần tài khoản. Mỗi phòng có tối đa 5 người, mời bằng đường dẫn.

## Chạy trên máy

Yêu cầu Node.js 22.12+ (đã kiểm tra với Node.js 24).

```sh
npm ci
npm run dev
```

Mở http://localhost:5173. Vite chạy cổng 5173, máy chủ phòng chạy cổng 2567. Giữ terminal đang chạy. Để thử nhiều người trên cùng máy, mở link mời trong các tab hoặc trình duyệt khác nhau.

Để thử cùng điện thoại trong cùng Wi-Fi, mở địa chỉ mạng của máy tính mà Vite in ra với cổng 5173. Máy chủ phòng phải truy cập được tại cổng 2567; link `localhost` chỉ dùng trên cùng máy. Không cần chỉnh tường lửa để thử các tab trên máy tính.

## Bản build và triển khai

```sh
npm run build
npm start
```

Máy chủ phục vụ cả thư mục `dist/`, matchmaking và WebSocket ở http://localhost:2567. Biến `PORT` đổi cổng. Có `GET /health` để kiểm tra dịch vụ. Dockerfile đi kèm phục vụ cùng một origin; đặt phía sau HTTPS/WSS trên một dịch vụ hỗ trợ WebSocket lâu dài.

Nếu tách frontend và backend, đặt `VITE_ROOM_SERVER=wss://dia-chi-may-chu` lúc build. Không đặt backend Colyseus vào static hosting hoặc Cloudflare Worker thông thường. Cấu hình Render dùng Docker, gói Free và kiểm tra sức khỏe tại `/health`. [Triển khai lên Render](https://render.com/deploy?repo=https://github.com/amystourisperson/Chua_Online).

## Điều khiển

- Chạm/click mặt đất để đi; WASD hoặc phím mũi tên trên máy tính.
- Kéo ngang để xoay camera, kéo dọc để ngẩng/cúi (kéo lên để nhìn trời). Cuộn chuột, chụm hai ngón hoặc nút +/− để thu phóng. Nút mây mở nhanh góc ngắm bầu trời; nút tâm ngắm đặt lại camera.
- Chọn Chính điện, Sân hương hoặc Góc thiền để đến nhanh. Nút **Khám phá** mở bốn điểm mới: Hồ thác nước, Lầu chuông, Chòi An Lạc và Rừng trúc.
- Mở hoạt động ở thanh dưới; đến đúng khu vực rồi bắt đầu. Có thể kết thúc hoạt động bất cứ lúc nào.
- Avatar đang thực hành đứng/ngồi tại chỗ. Trong chính điện mái tự ẩn để thấy rõ bên trong.
- Chọn một trong ba trang phục khi vào chùa; nút hình nhân vật bên phải mở tủ áo để đổi ngay trong phòng. Có bốn màu vải.
- Mở **Chat tổng**, nhập lời nhắn rồi nhấn Enter hoặc nút gửi. Tin nhắn xuất hiện trong bảng và trên đầu nhân vật trong khoảng 9 giây. Có thể thu gọn bảng chat.
- Bật chuông/mõ, âm nền và tiếng mõ người khác ở phần âm thanh. Mặc định tắt.

## Kiến trúc và đèn lồng — bản 06

Chính điện rộng hơn, cột cao hơn, mái cong hai tầng, tam quan ba lối và hai tháp sân chùa. Lầu chuông và chòi An Lạc có mái lớn, cột đỏ son, viền vàng đồng; cây xanh và gạch sân dùng màu đậm hơn. Đèn lồng treo phát sáng về đêm.

Chọn **Thả đèn → Đến sân đèn lồng**, chọn Đỏ son / Vàng ấm / Hồng sen, rồi **Thả đèn lên trời**. Nhân vật nâng tay và chiếc đèn bay lên trong khoảng một phút. Nút **Ngắm đèn trên trời** mở góc camera hướng lên. Đèn được đồng bộ trong phòng, người vào sau vẫn thấy đèn đang bay. Bạn có thể thả đèn liên tục. Phòng hiển thị 24 đèn mới nhất và tự dọn đèn hết hạn. Đổi ngày/đêm vẫn là lựa chọn cá nhân.

## Ngày và đêm

Nút **Ban ngày / Ban đêm** ở góc trên đổi ánh sáng riêng trên thiết bị và ghi nhớ khi tải lại. Ban đêm có trăng, sao lấp lánh, sao băng xuất hiện khoảng mỗi 1,35 giây, ánh trăng xanh và đèn chùa ấm. Chọn **Bình yên / Mưa** để đổi thời tiết trên thiết bị của bạn. Dùng nút mây **Ngắm bầu trời** để nhìn rõ. Khi hệ điều hành yêu cầu giảm chuyển động, sao đứng yên, sao băng tắt và đổi ánh sáng tức thì.

## Đã triển khai

- Khuôn viên rộng 60 × 52 đơn vị, gấp đôi diện tích trước đây. Sân trước có lối cây hoa, vườn đá và giàn hoa. Mở hai cánh vườn với lối đá nối sân, hồ thác nước chuyển động, lầu chuông, chòi nghỉ, cây hoa, rừng trúc và đồi xa. Bầu trời có màu chuyển tầng, mặt trời và mây trôi.

- Cảnh tam quan, sân gạch, hồ sen, chính điện, tượng Phật cách điệu và góc thiền; tài nguyên dựng bằng code, không tải mô hình bên ngoài.
- Avatar chibi có nét mặt, nếp áo, chuỗi hạt và ba dáng trang phục: **Áo lam**, **Áo tràng**, **Áo vạt chéo**. Tượng Phật màu ngà trên đài sen, quầng sáng vàng; thêm cây lay nhẹ, gợn nước, bướm và cánh hoa rơi. Giảm chuyển động cảnh theo cài đặt hệ điều hành.
- Chat tổng theo từng phòng, không gửi sang phòng khác. Giữ 50 tin gần nhất trong bộ nhớ phòng; tối đa 240 ký tự/tin, cách nhau ít nhất 1,2 giây. Tên người gửi do máy chủ xác định; nội dung hiển thị dưới dạng văn bản. Khách mới vào nhìn thấy lịch sử còn trong phòng.
- Tên/màu áo, trang phục, chuyển động và hành động đồng bộ; tối đa 5 khách; phòng không xuất hiện trong danh sách công khai.
- Lạy Phật, thắp hương, dâng hoa ba màu, tư thế tụng/niệm, bộ đếm tràng hạt cá nhân, gõ mõ liên tục đến khi chọn Dừng gõ mõ, gõ đại hồng chung ở lầu chuông, thiền 3/5/10 phút. Chuông có động tác dùng dùi, rung và âm ngân đồng bộ; mỗi lượt gõ cách nhau ít nhất 2,2 giây. Nhân vật có khớp tay, chân và eo riêng cho tư thế quỳ lạy/ngồi thực hành.
- Hương/hoa tự hết sau 3 phút, tối đa 20 vật phẩm/phòng. Có kiểm tra tốc độ di chuyển, vị trí tương tác, tần suất gửi lệnh và tranh chỗ ngồi.
- Giữ phiên 30 giây khi mất mạng; người tạo rời đi không đóng phòng. Phòng rỗng hủy sau 60 giây. Máy chủ restart làm mất phòng; không có cơ sở dữ liệu.
- Lưu tên, màu áo, trang phục và bật/tắt chuông/mõ trên thiết bị; không lưu lịch sử tâm linh trên máy chủ.

## Nội dung và giới hạn bản thử

Mục **Tụng kinh** hiện cho avatar ngồi thực hành và hiển thị lời niệm Phật có liên kết nguồn để người dùng tự đọc. **Chưa có bài kinh đầy đủ hoặc bản thu âm đã duyệt**; không dùng giọng AI làm bản tụng. Cần người có chuyên môn duyệt văn bản, nghi thức và quyền sử dụng bản thu trước khi bổ sung nội dung để ra mắt công khai.

Nguồn lời niệm: [Từ điển Phật học – Cổng thông tin Phật giáo Việt Nam](https://phatgiao.org.vn/tu-dien-phat-hoc-online/nam-mo-bon-su-thich-ca-mau-ni-phat-k57508.html). Đây là lời niệm, không được giới thiệu là một bài kinh hoàn chỉnh.

Âm chuông, mõ và nền được tổng hợp bằng Web Audio; kiến trúc và động tác là minh họa đơn giản, chưa phải mô phỏng nghi thức chuẩn. Chat mất khi phòng bị hủy hoặc máy chủ khởi động lại; chưa có chat riêng hay chat liên phòng. Không có tài khoản, thanh toán, công đức hoặc bảng xếp hạng. Font Be Vietnam Pro và Playfair Display tải qua Google Fonts, có font hệ thống dự phòng.

## Kiểm thử

```sh
npm run build
npm test
```

Kiểm thử bầu trời xác nhận chuyển ngày/đêm, sao băng kết thúc, khôi phục chế độ đã lưu, giảm chuyển động và dọn tài nguyên.

Test tích hợp tự mở máy chủ trên cổng ngẫu nhiên và dùng SDK kết nối WebSocket thật: 5 người, chặn người thứ sáu, kiểm tra vị trí, chỗ ngồi riêng, chín loại hoạt động, đồng bộ vật phẩm, giới hạn nhấn liên tục, hết hạn vật phẩm/thiền, reconnect, người tạo rời phòng, cả ba trang phục, tin nhắn chat, chống giả tên/người gửi, giới hạn độ dài/tần suất, giới hạn lịch sử và cách ly chat giữa các phòng. Bộ kiểm thử bổ sung kiểm tra diện tích bản đồ, mép hồ/vách chùa, bốn điểm mới và giới hạn camera ngước trời. Không cần khởi động máy chủ dev trước khi chạy test.

Đã kiểm tra trực tiếp giao diện trình duyệt desktop và breakpoint điện thoại bằng viewport giả lập. Chưa đo FPS trên điện thoại vật lý hoặc kiểm tra Safari iOS; cần hoàn tất các bước đó trước khi công bố hỗ trợ thiết bị. Nhóm người dùng thật và người duyệt nội dung chưa được huy động.

## Cấu trúc

- `src/scene.ts`: cảnh 3D, avatar, camera, batching hình học và di chuyển.
- `src/sky.ts`: chuyển ngày/đêm, trăng, sao và sao băng.
- `src/avatar-animation.ts`: tư thế, động tác và khớp tay nhân vật.
- `src/landscape.ts`, `src/camera.ts`: khu cảnh quan mở rộng, bầu trời và phép tính góc camera.
- `src/temple-art.ts`: mô hình nhân vật, tượng Phật và phong cảnh chuyển động.
- `src/social.tsx`: tủ trang phục và bảng chat.
- `src/main.tsx`, `src/style.css`: trải nghiệm và giao diện responsive.
- `src/shared.ts`: hoạt động, tọa độ vùng và hợp đồng trạng thái.
- `server/TempleRoom.ts`: dữ liệu và quy tắc phòng do máy chủ quản lý.
- `tests/room.test.ts`: kiểm thử nhiều kết nối thực.
