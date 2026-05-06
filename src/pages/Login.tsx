import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ADMIN_PIN = '4829'; // 관리자 '만두'의 비밀 PIN 번호 (원하는 번호로 변경 가능)

const Login = () => {
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    if (val.trim() === '만두') {
      setShowPin(true);
    } else {
      setShowPin(false);
      setPin('');
    }
  };

  const handleStart = async () => {
    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length === 0) {
      alert('닉네임을 입력해주세요!');
      return;
    }

    setLoading(true);

    try {
      // 1. 관리자 '만두'인 경우 PIN 검증
      if (trimmedNickname === '만두') {
        if (!pin) {
          alert('관리자 PIN 번호를 입력해주세요!');
          setLoading(false);
          return;
        }
        if (pin !== ADMIN_PIN) {
          alert('올바르지 않은 관리자 PIN 번호입니다.');
          setLoading(false);
          return;
        }
      } else {
        // 2. 일반 사용자인 경우 중복 체크
        // 이미 저장된 로컬스토리지 이름과 같으면 프리패스
        const stored = localStorage.getItem('sidex_nickname');
        if (stored !== trimmedNickname) {
          // sidex_items 테이블에서 중복 확인
          const { data: itemMatch, error: itemErr } = await supabase
            .from('sidex_items')
            .select('recommender_name')
            .eq('recommender_name', trimmedNickname)
            .limit(1);

          if (itemErr) throw itemErr;

          // sidex_comments 테이블에서 중복 확인
          const { data: commentMatch, error: commentErr } = await supabase
            .from('sidex_comments')
            .select('commenter_name')
            .eq('commenter_name', trimmedNickname)
            .limit(1);

          if (commentErr) throw commentErr;

          if ((itemMatch && itemMatch.length > 0) || (commentMatch && commentMatch.length > 0)) {
            alert('이미 사용 중인 닉네임입니다. 다른 원장님과 구분될 수 있도록 고유한 이름을 입력해 주세요! (예: 강남유치과, 김원장)');
            setLoading(false);
            return;
          }
        }
      }

      // 3. 로컬 스토리지에 닉네임 저장 및 이동
      localStorage.setItem('sidex_nickname', trimmedNickname);
      navigate('/'); // 메인 피드 화면으로 이동
    } catch (error) {
      console.error('Error during nickname validation:', error);
      alert('닉네임 검증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>👋 환영합니다!</h2>
        <p style={{ color: 'var(--text-muted)' }}>시덱스 추천템 리스트를 공유하기 위해<br/>원장님의 닉네임(또는 병원명)을 설정해주세요.</p>
      </div>

      <div className="input-group" style={{ width: '100%', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          type="text" 
          className="text-input" 
          placeholder="예: 강남유치과, 김원장" 
          value={nickname}
          onChange={(e) => handleNicknameChange(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => e.key === 'Enter' && !showPin && handleStart()}
        />

        {showPin && (
          <div style={{
            animation: 'slideDown 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>🔒 관리자 인증 PIN 번호</label>
            <input 
              type="password" 
              className="text-input" 
              placeholder="PIN 번호 4자리를 입력하세요" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              disabled={loading}
              maxLength={4}
            />
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={handleStart} disabled={loading} style={{ width: '100%' }}>
        {loading ? '검증 중...' : '입장하기'}
      </button>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
