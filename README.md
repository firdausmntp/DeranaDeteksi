# DeranaDeteksi

[![Deploy to GitHub Pages](https://github.com/firdausmntp/deranadeteksi/actions/workflows/deploy.yml/badge.svg)](https://github.com/firdausmntp/deranadeteksi/actions/workflows/deploy.yml)
[![Build and Test](https://github.com/firdausmntp/deranadeteksi/actions/workflows/test.yml/badge.svg)](https://github.com/firdausmntp/deranadeteksi/actions/workflows/test.yml)
[![Release](https://github.com/firdausmntp/deranadeteksi/actions/workflows/release.yml/badge.svg)](https://github.com/firdausmntp/deranadeteksi/actions/workflows/release.yml)

🔍 **AI Content Detection Tool** - Deteksi konten yang dibuat oleh AI dengan akurasi tinggi

## 🚀 Live Demo

**🌐 [https://firdausmntp.github.io/deranadeteksi/](https://firdausmntp.github.io/deranadeteksi/)**

## ✨ Features

- 📄 **PDF Text Extraction** - Extract teks dari file PDF
- 🤖 **AI Detection** - Deteksi konten AI vs Human
- 📊 **Analysis Results** - Probabilitas dan confidence score
- 🎨 **Modern UI** - Interface yang clean dan responsive
- ⚡ **Fast Processing** - Analisis cepat dan real-time

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **PDF Processing**: PDF.js
- **HTTP Client**: Axios
- **Deployment**: GitHub Pages + GitHub Actions

## 🏃‍♂️ Quick Start

### Development

```bash
# Clone repository
git clone https://github.com/firdausmntp/deranadeteksi.git
cd deranadeteksi

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build project
npm run build

# Preview build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## 📁 Project Structure

```
DeranaDeteksi/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── common/
│   │   └── DeranaDeteksi/
│   ├── hooks/
│   ├── utils/
│   └── main.jsx
├── public/
├── .github/workflows/
└── package.json
```

## 🔄 Deployment

Project ini menggunakan GitHub Actions untuk otomasi CI/CD:

- **🧪 Test**: Otomatis test di setiap PR
- **🚀 Deploy**: Auto-deploy ke GitHub Pages saat push ke main
- **📦 Release**: Create release saat push tag

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk detail lengkap.

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👨‍💻 Author

**Firdaus Satrio Utomo**

- GitHub: [@firdausmntp](https://github.com/firdausmntp)
- Project: [DeranaDeteksi](https://github.com/firdausmntp/deranadeteksi)
