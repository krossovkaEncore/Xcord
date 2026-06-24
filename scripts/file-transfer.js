/**
 * File Transfer - Передача файлов через WebRTC DataChannel
 * 
 * Поддерживает:
 * - Разбиение на чанки
 * - Прогресс бар
 * - Отмена передачи
 * - Автосохранение
 */

class FileTransfer {
    constructor() {
        this.CHUNK_SIZE = 16384; // 16KB
        this.transfers = new Map();
    }

    /**
     * Отправка файла через DataChannel
     */
    async sendFile(dataChannel, file, onProgress) {
        const transferId = this.generateId();
        
        const fileInfo = {
            id: transferId,
            name: file.name,
            size: file.size,
            type: file.type,
            chunks: Math.ceil(file.size / this.CHUNK_SIZE)
        };

        // Отправляем метаданные
        await this.sendChunk(dataChannel, {
            type: 'file_start',
            data: fileInfo
        });

        // Читаем файл и отправляем чанками
        const chunks = await this.readFileChunks(file);
        
        let sent = 0;
        for (const chunk of chunks) {
            await this.sendChunk(dataChannel, {
                type: 'file_chunk',
                transferId: transferId,
                chunk: chunk,
                sent: ++sent
            });

            if (onProgress) {
                onProgress(sent / chunks.length * 100);
            }

            // Небольшая задержка чтобы не перегрузить канал
            await this.sleep(5);
        }

        // Завершение
        await this.sendChunk(dataChannel, {
            type: 'file_end',
            transferId: transferId
        });

        console.log('[FileTransfer] File sent:', file.name);
        return transferId;
    }

    /**
     * Получение файла из DataChannel
     */
    receiveFile(data) {
        switch (data.type) {
            case 'file_start':
                return this.handleFileStart(data.data);
            
            case 'file_chunk':
                return this.handleFileChunk(data);
            
            case 'file_end':
                return this.handleFileEnd(data.transferId);
        }
    }

    /**
     * Начало получения файла
     */
    handleFileStart(fileInfo) {
        console.log('[FileTransfer] Receiving file:', fileInfo.name);
        
        this.transfers.set(fileInfo.id, {
            ...fileInfo,
            chunks: [],
            received: 0
        });

        return {
            type: 'file_ack',
            transferId: fileInfo.id,
            accepted: true
        };
    }

    /**
     * Получение чанка файла
     */
    handleFileChunk(data) {
        const transfer = this.transfers.get(data.transferId);
        if (!transfer) {
            console.error('[FileTransfer] Unknown transfer:', data.transferId);
            return null;
        }

        transfer.chunks.push(data.chunk);
        transfer.received++;

        return {
            type: 'file_progress',
            transferId: data.transferId,
            progress: transfer.received / transfer.chunks * 100
        };
    }

    /**
     * Завершение получения файла
     */
    async handleFileEnd(transferId) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) {
            console.error('[FileTransfer] Unknown transfer:', transferId);
            return null;
        }

        // Собираем файл из чанков
        const blob = new Blob(transfer.chunks, { type: transfer.type });
        
        // Сохраняем файл
        await this.saveFile(blob, transfer.name);

        // Очищаем
        this.transfers.delete(transferId);

        console.log('[FileTransfer] File received:', transfer.name);
        return {
            type: 'file_complete',
            transferId: transferId,
            fileName: transfer.name
        };
    }

    /**
     * Чтение файла чанками
     */
    async readFileChunks(file) {
        const chunks = [];
        let offset = 0;

        while (offset < file.size) {
            const chunk = file.slice(offset, offset + this.CHUNK_SIZE);
            const arrayBuffer = await this.readArrayBuffer(chunk);
            chunks.push(arrayBuffer);
            offset += this.CHUNK_SIZE;
        }

        return chunks;
    }

    /**
     * Чтение Blob как ArrayBuffer
     */
    readArrayBuffer(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsArrayBuffer(blob);
        });
    }

    /**
     * Отправка чанка через DataChannel
     */
    sendChunk(dataChannel, data) {
        return new Promise((resolve) => {
            if (dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify(data));
                resolve();
            } else {
                // Ждем открытия канала
                setTimeout(() => this.sendChunk(dataChannel, data), 100);
            }
        });
    }

    /**
     * Сохранение файла на диск
     */
    async saveFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Генерация уникального ID
     */
    generateId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Задержка
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Отмена передачи
     */
    cancelTransfer(transferId) {
        this.transfers.delete(transferId);
        console.log('[FileTransfer] Transfer cancelled:', transferId);
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileTransfer;
}
