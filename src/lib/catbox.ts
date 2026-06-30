export async function uploadToCatbox(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('reqtype', 'fileupload');
  formData.append('fileToUpload', file);

  const response = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image to Catbox');
  }

  const url = await response.text();
  if (!url.startsWith('https://')) {
    throw new Error(`Invalid response from Catbox: ${url}`);
  }

  return url;
}

export async function uploadToCatboxFromBase64(base64Data: string, filename: string = 'image.png'): Promise<string> {
  const base64 = base64Data.split(',')[1] || base64Data;
  const mimeType = base64Data.split(';')[0]?.split(':')[1] || 'image/png';
  
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const file = new File([byteArray], filename, { type: mimeType });

  return uploadToCatbox(file);
}