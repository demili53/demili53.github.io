(() => {
  const filename = 'EXAONE-Agent-2.3.0.exe';
  const expectedSize = 185368156;
  const expectedHash = '224ab0316cf384e67581ec90b13ae950c362f9f5206654dfe483f91600934294';
  const button = document.getElementById('download-button');
  const status = document.getElementById('download-status');
  const progress = document.getElementById('download-progress');
  const result = document.getElementById('download-result');
  let objectUrl;
  button.addEventListener('click', async () => {
    button.disabled = true; progress.hidden = false; progress.value = 0;
    result.replaceChildren();
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = undefined; }
    const chunks = []; let received = 0;
    try {
      if (!globalThis.crypto?.subtle) throw new Error('HTTPS 페이지에서 다시 시도해 주세요.');
      for (let part = 1; part <= 3; part++) {
        status.textContent = `분할 파일 ${part}/3 다운로드 중…`;
        const response = await fetch(`downloads/${filename}.part${part}`);
        if (!response.ok) throw new Error(`파일 ${part} 다운로드 실패 (HTTP ${response.status})`);
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          chunks.push(value); received += value.byteLength; progress.value = received;
          if (received > expectedSize) { await reader.cancel(); throw new Error('파일 크기가 일치하지 않습니다.'); }
          status.textContent = `다운로드 중 ${Math.floor(received / expectedSize * 100)}% · ${(received / 1048576).toFixed(1)} / 176.8 MiB`;
        }
      }
      if (received !== expectedSize) throw new Error('파일 크기가 일치하지 않습니다. 다시 시도해 주세요.');
      status.textContent = '다운로드 완료. 원본 파일의 SHA-256을 검증하고 있습니다…';
      const blob = new Blob(chunks, { type: 'application/octet-stream' }); chunks.length = 0;
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== expectedHash) throw new Error('파일 검증 실패. 저장하지 않았습니다. 다시 시도해 주세요.');
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = objectUrl; link.download = filename;
      link.textContent = '저장이 시작되지 않았다면 여기를 눌러 EXE 저장'; result.append(link); link.click();
      status.textContent = '검증 완료. 브라우저의 다운로드 목록에서 EXE 저장 상태를 확인하세요.';
    } catch (error) {
      status.textContent = `다운로드를 완료하지 못했습니다: ${error.message} 아래 직접 다운로드 방법을 이용하거나 다시 시도하세요.`;
    } finally { button.disabled = false; }
  });
})();
