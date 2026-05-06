import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, MessageSquare, Send, Image, ChevronDown, ChevronUp, Upload, MoreVertical, Edit2, Trash2, X } from 'lucide-react';

interface SidexComment {
  id: number;
  commenter_name: string;
  content: string;
  created_at: string;
}

interface SidexItem {
  id: number;
  item_name: string;
  image_url: string;
  recommender_name: string;
  location?: string;
  created_at: string;
  sidex_comments?: SidexComment[];
}

const Feed = () => {
  const [items, setItems] = useState<SidexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [key: number]: boolean }>({});
  const [showMap, setShowMap] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [isFullscreenMapOpen, setIsFullscreenMapOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<SidexItem | null>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const savedNickname = localStorage.getItem('sidex_nickname');
    if (!savedNickname) {
      navigate('/login');
      return;
    }
    setNickname(savedNickname);

    fetchItems();
    fetchMap();

    // 실시간 업데이트 구독 (물품, 댓글, 지도 변경 시 새로고침)
    const itemsSubscription = supabase
      .channel('public:changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sidex_items' }, () => {
        fetchItems();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sidex_comments' }, () => {
        fetchItems();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sidex_map' }, () => {
        fetchMap();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsSubscription);
    };
  }, [navigate]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sidex_items')
        .select('*, sidex_comments(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        sidex_comments: (item.sidex_comments || []).sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }));

      setItems(formattedData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 이 추천템을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('sidex_items').delete().eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const fetchMap = async () => {
    try {
      const { data, error } = await supabase
        .from('sidex_map')
        .select('image_url')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      if (data) setMapUrl(data.image_url);
    } catch (error) {
      console.error('Error fetching map:', error);
    }
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

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingMap(true);

    try {
      // 지도는 크고 정밀해야 하므로 가로 최대 1600px, 화질 85%로 압축 적용
      const compressedBlob = await compressImage(file, 1600, 0.85);
      const compressedFile = new File([compressedBlob], `map-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const fileName = `map-${Date.now()}.jpg`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sidex_images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sidex_images')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('sidex_map')
        .upsert({ id: 1, image_url: publicUrl });

      if (dbError) throw dbError;

      setMapUrl(publicUrl);
      alert('지도가 성공적으로 업데이트되었습니다! 🗺️');
    } catch (error) {
      console.error('Error uploading map:', error);
      alert('지도 업로드에 실패했습니다.');
    } finally {
      setUploadingMap(false);
    }
  };

  const handleAddComment = async (itemId: number) => {
    const commentContent = commentInputs[itemId]?.trim();
    if (!commentContent) return;

    setSubmittingComment(prev => ({ ...prev, [itemId]: true }));

    try {
      const { error } = await supabase
        .from('sidex_comments')
        .insert([
          {
            item_id: itemId,
            commenter_name: nickname,
            content: commentContent
          }
        ]);

      if (error) throw error;

      // 입력창 비우기
      setCommentInputs(prev => ({ ...prev, [itemId]: '' }));
      fetchItems(); // 댓글 목록 갱신
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>원장님들의 추천템 모아보기</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>👤 {nickname}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button 
          onClick={() => setShowMap(!showMap)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 14px',
            background: showMap ? '#EEF2FF' : 'white',
            border: `1px solid ${showMap ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '10px',
            color: showMap ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Image size={18} />
          <span>{showMap ? '지도 접기' : '지도 보기'}</span>
          {showMap ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <button 
          onClick={() => mapInputRef.current?.click()}
          disabled={uploadingMap}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 14px',
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--text-main)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {uploadingMap ? <div className="loader" style={{ width: '16px', height: '16px', borderColor: '#cbd5e1', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }}></div> : <Upload size={18} />}
          <span>{uploadingMap ? '업로드 중...' : '지도 등록'}</span>
        </button>
        <input 
          type="file" 
          accept="image/*" 
          ref={mapInputRef} 
          onChange={handleMapUpload} 
          style={{ display: 'none' }} 
        />
      </div>

      {/* 지도 아코디언 영역 */}
      {showMap && (
        <div style={{ 
          background: 'white', 
          border: '1px solid var(--border)', 
          borderRadius: '16px', 
          padding: '16px', 
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {mapUrl ? (
            <div 
              style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '12px', cursor: 'zoom-in' }}
              onClick={() => setIsFullscreenMapOpen(true)}
            >
              <img 
                src={mapUrl} 
                alt="전시장 지도" 
                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block', transition: 'transform 0.2s' }} 
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                💡 이미지를 클릭하면 전체 화면에서 손가락으로 확대해 볼 수 있습니다.
              </div>
            </div>
          ) : (
            <div style={{ 
              height: '150px', 
              border: '2px dashed var(--border)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              textAlign: 'center',
              padding: '20px'
            }}>
              등록된 지도가 없습니다.<br/>우측의 '지도 등록' 버튼으로 지도를 올려주세요!
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #E2E8F0' }}>
          아직 추천된 물품이 없습니다.<br/>첫 번째로 추천해 보세요!
        </div>
      ) : (
        <div className="feed-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {items.map(item => (
            <div key={item.id} className="feed-card" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
              <img src={item.image_url} alt={item.item_name} style={{ width: '100%', height: '250px', objectFit: 'cover' }} />
              
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>{item.item_name}</h3>
                  {(item.recommender_name === nickname || nickname === '만두') && (
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                        style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {activeMenu === item.id && (
                        <>
                          <div 
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} 
                            onClick={() => setActiveMenu(null)}
                          />
                          <div style={{ 
                            position: 'absolute', right: 0, top: '30px', background: 'white', borderRadius: '8px', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border)', zIndex: 10,
                            minWidth: '120px', overflow: 'hidden'
                          }}>
                            <button 
                              onClick={() => { setActiveMenu(null); setEditingItem(item); }}
                              style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            >
                              <Edit2 size={16} /> 수정하기
                            </button>
                            <button 
                              onClick={() => { setActiveMenu(null); handleDelete(item.id); }}
                              style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', color: '#EF4444' }}
                            >
                              <Trash2 size={16} /> 삭제하기
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {item.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: '#64748B', marginBottom: '12px' }}>
                    <MapPin size={16} />
                    <span>{item.location}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '20px', fontWeight: 500, color: 'var(--primary)' }}>
                    👤 {item.recommender_name || '익명'}
                  </span>
                  <span>
                    {new Date(item.created_at).toLocaleString('ko-KR', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>

              {/* 댓글 리스트 영역 */}
              <div style={{ background: '#FAFAFA', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px' }}>
                  <MessageSquare size={16} />
                  <span>댓글 {item.sidex_comments?.length || 0}개</span>
                </div>

                {item.sidex_comments && item.sidex_comments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                    {item.sidex_comments.map(comment => (
                      <div key={comment.id} style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                        <strong style={{ marginRight: '8px', color: 'var(--text-main)' }}>{comment.commenter_name}</strong>
                        <span style={{ color: '#334155' }}>{comment.content}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 댓글 작성창 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text"
                    className="text-input"
                    style={{ padding: '10px 14px', borderRadius: '20px', fontSize: '0.85rem', flex: 1, height: '40px' }}
                    placeholder="의견을 남겨주세요..."
                    value={commentInputs[item.id] || ''}
                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(item.id)}
                  />
                  <button 
                    onClick={() => handleAddComment(item.id)}
                    disabled={submittingComment[item.id]}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: commentInputs[item.id]?.trim() ? 1 : 0.5,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <button 
        className="fab-button"
        onClick={() => navigate('/add')}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: 'calc(50% - 240px + 30px)', // 중앙 정렬된 앱 컨테이너 기준
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'all 0.2s ease'
        }}
      >
        <PlusCircle size={32} />
      </button>

      {/* 모바일 화면에서 버튼 위치 조정을 위한 미디어 쿼리용 인라인 스타일 */}
      <style>{`
        @media (max-width: 480px) {
          .fab-button {
            right: 30px !important;
          }
        }
        .fab-button:hover {
          transform: scale(1.05);
        }
        .fab-button:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* 전체 화면 지도 모달 */}
      {isFullscreenMapOpen && mapUrl && (
        <FullscreenMapModal imageUrl={mapUrl} onClose={() => setIsFullscreenMapOpen(false)} />
      )}

      {/* 수정 모달 */}
      {editingItem && (
        <EditItemModal 
          item={editingItem} 
          onClose={() => setEditingItem(null)} 
          onSuccess={() => {
            setEditingItem(null);
            fetchItems(); // 목록 갱신
          }}
        />
      )}
    </div>
  );
};

// 1. 스마트폰 갤러리 방식 (풀스크린 핀치 줌) 구현 서브 컴포넌트
interface FullscreenMapProps {
  imageUrl: string;
  onClose: () => void;
}

const FullscreenMapModal: React.FC<FullscreenMapProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number }[]>([]);
  const startDistRef = useRef(0);
  const startScaleRef = useRef(1);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    if (touches.length === 1) {
      touchStartRef.current = [{ x: touches[0].clientX, y: touches[0].clientY }];
      startPosRef.current = { ...position };
    } else if (touches.length === 2) {
      touchStartRef.current = [
        { x: touches[0].clientX, y: touches[0].clientY },
        { x: touches[1].clientX, y: touches[1].clientY }
      ];
      startScaleRef.current = scale;
      startDistRef.current = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      startPosRef.current = { ...position };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    if (touches.length === 1 && touchStartRef.current.length === 1) {
      const dx = touches[0].clientX - touchStartRef.current[0].x;
      const dy = touches[0].clientY - touchStartRef.current[0].y;
      setPosition({
        x: startPosRef.current.x + dx,
        y: startPosRef.current.y + dy
      });
    } else if (touches.length === 2 && touchStartRef.current.length === 2) {
      const currentDist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      const factor = currentDist / startDistRef.current;
      const newScale = Math.max(1, Math.min(startScaleRef.current * factor, 5));
      setScale(newScale);

      const centerX = (touches[0].clientX + touches[1].clientX) / 2;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2;
      const startCenterX = (touchStartRef.current[0].x + touchStartRef.current[1].x) / 2;
      const startCenterY = (touchStartRef.current[0].y + touchStartRef.current[1].y) / 2;
      const dx = centerX - startCenterX;
      const dy = centerY - startCenterY;
      setPosition({
        x: startPosRef.current.x + dx,
        y: startPosRef.current.y + dy
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = [];
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.95)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 1010
      }}>
        <button 
          onClick={reset}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          원래 크기
        </button>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          ✕
        </button>
      </div>

      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img 
          src={imageUrl} 
          alt="전시장 지도 풀스크린" 
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: touchStartRef.current.length === 0 ? 'transform 0.15s ease-out' : 'none',
            userSelect: 'none'
          }} 
        />
      </div>

      <div style={{
        position: 'absolute',
        bottom: '30px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.85rem',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 1010,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)'
      }}>
        두 손가락으로 늘려 확대하고, 밀어서 이동하세요.
      </div>
    </div>
  );
};

// 수정 모달 서브 컴포넌트
interface EditItemProps {
  item: SidexItem;
  onClose: () => void;
  onSuccess: () => void;
}

const EditItemModal: React.FC<EditItemProps> = ({ item, onClose, onSuccess }) => {
  const [name, setName] = useState(item.item_name);
  const [location, setLocation] = useState(item.location || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(item.image_url);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
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
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob failed'));
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

  const handleSave = async () => {
    if (!name.trim()) return alert('물품명을 입력해주세요.');
    setLoading(true);
    try {
      let imageUrl = item.image_url;

      // 새 사진이 있다면 압축 후 업로드
      if (photo) {
        const compressedBlob = await compressImage(photo, 1200, 0.7);
        const compressedFile = new File([compressedBlob], `item-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const filePath = `public/item-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage.from('sidex_images').upload(filePath, compressedFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('sidex_images').getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('sidex_items').update({
        item_name: name.trim(),
        location: location.trim() || null,
        image_url: imageUrl
      }).eq('id', item.id);

      if (error) throw error;
      alert('수정되었습니다! 🎉');
      onSuccess();
    } catch (error) {
      console.error('Error updating:', error);
      alert('수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>추천템 수정</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="#64748B" /></button>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%', height: '200px', borderRadius: '16px', background: '#F1F5F9', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
        >
          <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="미리보기" />
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'white', padding: '10px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <Edit2 size={20} color="var(--primary)" />
          </div>
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoChange} style={{ display: 'none' }} />

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>물품명 (필수)</label>
          <input className="text-input" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>판매 장소 / 부스</label>
          <input className="text-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="예: HALL C 123" />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#64748B', fontWeight: 600, border: 'none', cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex: 2, padding: '14px', borderRadius: '12px', opacity: loading ? 0.7 : 1 }}>
            {loading ? '저장 중...' : '저장 완료'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Feed;
