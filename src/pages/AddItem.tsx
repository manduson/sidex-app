import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Send, ArrowLeft, MapPin, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const AddItem = () => {
  const queryClient = useQueryClient();
  const [itemName, setItemName] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [isServerOn, setIsServerOn] = useState(true);
  
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedNickname = localStorage.getItem('sidex_nickname');
    if (!savedNickname) {
      navigate('/login');
      return;
    }
    setNickname(savedNickname);

    // 서버 활성 상태 실시간성 체크
    const checkServer = async () => {
      try {
        const { data } = await supabase
          .from('sidex_map')
          .select('image_url')
          .eq('id', 3)
          .maybeSingle();
        if (data && data.image_url === 'OFF' && savedNickname !== '만두') {
          setIsServerOn(false);
        }
      } catch (err) {
        console.error('Error checking server status:', err);
      }
    };
    checkServer();
  }, [navigate]);

  useEffect(() => {
    // 메모리 누수 방지를 위해 컴포넌트 언마운트 시 오브젝트 URL 해제
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
    // 동일한 파일 재선택 가능하도록 초기화
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      showToast('사진을 한 장 이상 등록해주세요.');
      return;
    }
    if (!itemName.trim()) {
      showToast('물품명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const currentPhoto = photos[i];
        // 일반 아이템 사진은 가로 최대 1200px, 화질 70%로 가볍게 압축 적용
        const compressedBlob = await compressImage(currentPhoto, 1200, 0.7);
        const compressedFile = new File([compressedBlob], `item-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' });

        const fileName = `item-${Date.now()}-${i}.jpg`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sidex_images')
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('sidex_images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // 쉼표(,)로 연결하여 다중 이미지 URL 저장
      const combinedUrls = uploadedUrls.join(',');

      // Insert record into 'sidex_items' table with recommender_name and location
      const { error: dbError } = await supabase
        .from('sidex_items')
        .insert([
          {
            item_name: itemName,
            image_url: combinedUrls,
            recommender_name: nickname,
            location: location.trim() || null
          }
        ]);

      if (dbError) throw dbError;

      // 안 C: 새로운 데이터베이스 반영 후 기존 캐시 무효화 (새로고침 없이 다음 화면에서 보이도록)
      queryClient.invalidateQueries({ queryKey: ['feedItems'] });

      showToast('추천템이 성공적으로 등록되었습니다! 🎉');
      
      // Go back to feed after short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error: any) {
      console.error('Error submitting:', error);
      showToast(`등록 실패: ${error.message}`);
      setLoading(false);
    }
  };

  if (!isServerOn && nickname !== '만두') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: '40px 20px',
        gap: '16px'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>⚠️</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          지금은 서버를 이용할 수 없습니다.
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6', maxWidth: '300px' }}>
          서버가 일시 중지된 상태이거나 점검 중입니다. 원장님/관리자에게 문의해 주세요.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '10px',
            background: '#F1F5F9',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#64748B',
            cursor: 'pointer'
          }}
        >
          메인으로 이동
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>새 추천템 등록하기</h2>
      </div>

      {previews.length === 0 ? (
        <div 
          className="upload-card"
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: 'pointer' }}
        >
          <div className="upload-icon">
            <Camera size={32} />
          </div>
          <div className="upload-text">사진 올리기 (촬영/갤러리)</div>
          <div className="upload-subtext">여기를 눌러 추천할 물품 사진을 촬영하거나 갤러리에서 선택하세요. (여러 장 가능)</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            overflowX: 'auto', 
            padding: '8px 4px', 
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch' 
          }}>
            {previews.map((previewUrl, index) => (
              <div 
                key={index} 
                style={{ 
                  position: 'relative', 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  border: '1px solid var(--border)'
                }}
              >
                <img 
                  src={previewUrl} 
                  alt={`미리보기 ${index + 1}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: 0
                  }}
                >
                  ✕
                </button>
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: 600
                }}>
                  {index === 0 ? '대표' : `${index + 1}`}
                </div>
              </div>
            ))}
            
            {/* 추가 버튼 카드 */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '12px',
                border: '2px dashed var(--primary)',
                background: 'var(--primary-light)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                flexShrink: 0,
                color: 'var(--primary)'
              }}
            >
              <PlusCircle size={24} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>사진 추가</span>
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>💡 업로드된 사진 중 첫 번째 사진이 목록의 대표 이미지로 사용됩니다.</span>
        </div>
      )}
      
      {/* multiple 활성화 및 capture 제거하여 안A 구현 */}
      <input 
        type="file" 
        accept="image/*" 
        multiple
        ref={fileInputRef}
        onChange={handlePhotoCapture}
        style={{ display: 'none' }}
      />

      <div className="input-group">
        <label>추천 물품명</label>
        <input 
          type="text" 
          className="text-input" 
          placeholder="예: 덴탈 마스크 10박스" 
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>장소 (선택)</label>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <MapPin size={20} />
          </div>
          <input 
            type="text" 
            className="text-input" 
            style={{ paddingLeft: '42px' }}
            placeholder="예: 코엑스 C홀 오스템 부스" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <button 
        className="btn btn-primary" 
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <><div className="loader"></div> 등록 중...</>
        ) : (
          <><Send size={20} /> 추천하기</>
        )}
      </button>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default AddItem;
