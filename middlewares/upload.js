const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');

// GCP 서비스 계정 키 파일 세팅 (.env 등에 경로 설정)
const storage = new Storage({
  keyFilename: process.env.GCP_KEYFILE_PATH, 
  projectId: process.env.GCP_PROJECT_ID,
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);

// 메모리에 파일을 임시로 두고 바로 GCP로 쏘기 위한 설정
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
});

const uploadToGCS = (req, res, next) => {
  if (!req.file) return next();

  // 파일명 중복을 피하기 위한 고유한 이름 생성
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  
  // 원본 파일에서 확장자 추출 (예: .jpg, .png)
  const fileExt = path.extname(req.file.originalname);
  
  // 기존 포맷인 [유니크네임.확장자] 형태로 파일명 결합
  const filename = uniqueSuffix + fileExt;

  // GCP 버킷의 certifications 폴더 안에 해당 파일명으로 지정
  const blob = bucket.file(`certifications/${filename}`);

  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: { contentType: req.file.mimetype },
  });

  blobStream.on('error', (err) => next(err));

  blobStream.on('finish', () => {
    // 업로드 완료 후 생성된 공개 URL을 req 객체에 붙여서 라우터로 넘김
    req.file.gcsUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    next();
  });

  blobStream.end(req.file.buffer);
};

module.exports = { uploader, uploadToGCS };
