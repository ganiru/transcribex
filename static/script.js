document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const recordButton = document.getElementById('recordButton');
    const micIcon = document.getElementById('micIcon');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const recordingStatus = document.getElementById('recordingStatus');
    const transcribingStatus = document.getElementById('transcribingStatus');
    let mediaRecorder;
    let audioChunks = [];
    let allStreams;

    recordButton.addEventListener('click', toggleRecording);

    async function toggleRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            try {
                await startRecording();
            } catch (error) {
                console.error('Error starting recording:', error);
                alert('Failed to start recording. Please check your microphone permissions.');
            }
        }
    }

    async function startRecording() {
        console.log('Attempting to start recording...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        allStreams = stream;
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = sendAudioToServer;
        mediaRecorder.start();
        console.log('Recording started');
        recordButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');
        recordButton.classList.add('bg-red-500', 'hover:bg-red-600');
        micIcon.classList.add('animate-pulse');
        recordingStatus.classList.remove('hidden');
        transcribingStatus.classList.add('hidden');
    }

    function stopRecording() {
        console.log('Stopping recording...');
        mediaRecorder.stop();
        allStreams.getTracks().forEach(track => track.stop());
        recordButton.classList.remove('bg-red-500', 'hover:bg-red-600');
        recordButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
        micIcon.classList.remove('animate-pulse');
        recordingStatus.classList.add('hidden');
        transcribingStatus.classList.remove('hidden');
    }

    function sendAudioToServer() {
        console.log('Sending audio to server...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = [];
        const reader = new FileReader();
        reader.onload = function(event) {
            socket.emit('audio_data', event.target.result);
        };
        reader.readAsArrayBuffer(audioBlob);
    }

    socket.on('transcription_result', (data) => {
        console.log('Received transcription:', data);
        transcriptionOutput.textContent += data.transcription + '\r\n';
        transcribingStatus.classList.add('hidden');
        if (data.transcription != '') {
            copyButton.disabled = false;
            downloadButton.disabled = false;
        } else {
            copyButton.disabled = true;
            downloadButton.disabled = true;
        }
    });

    const copyButton = document.getElementById('copyButton');
    const downloadButton = document.getElementById('downloadButton');
    copyButton.disabled = true;
    downloadButton.disabled = true;
    const clearButton = document.getElementById('clearButton');

    copyButton.addEventListener('click', copyToClipboard);
    downloadButton.addEventListener('click', downloadAsText);
    clearButton.addEventListener('click', clearTranscription);

    function copyToClipboard() {
        const text = transcriptionOutput.textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('Transcription copied to clipboard!');
        }).catch(err => {
            console.error('Error copying text: ', err);
        });
    }

    function downloadAsText() {
        const text = transcriptionOutput.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const hour = today.getHours();
        const minute = today.getMinutes();
        const second = today.getSeconds();
        const now = `${year}${month}${day}${hour}${minute}${second}`;
        
        a.download = `transcript_${now}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function clearTranscription() {
        transcriptionOutput.textContent = '';
    }
});