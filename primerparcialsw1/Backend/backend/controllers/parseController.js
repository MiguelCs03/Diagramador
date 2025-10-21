const llmClient = require('../utils/llmClient');

const parseController = {
  // POST /api/parse-diagram
  parse: async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Buffer de la imagen subida (multer memoryStorage)
      const imageBuffer = req.file.buffer;
      const imageSize = (imageBuffer.length / 1024).toFixed(2);
      
      console.log(`[parseController] Received image: ${req.file.originalname || 'unknown'}`);
      console.log(`[parseController] Image size: ${imageSize} KB`);
      console.log(`[parseController] MIME type: ${req.file.mimetype}`);

      // Opciones opcionales
      const language = req.body.lang || 'es';
      const useLLM = req.body.useLLM !== 'false'; // default true

      console.log(`[parseController] Options: language=${language}, useLLM=${useLLM}`);

      // Delegar a cliente LLM (configurable vía env)
      const startTime = Date.now();
  const result = await llmClient.analyzeImage(imageBuffer, { language, useLLM, mimeType: req.file.mimetype });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`[parseController] Analysis completed in ${elapsed}s`);
      console.log(`[parseController] Result: ${result.diagram?.entities?.length || 0} entities, ${result.diagram?.relations?.length || 0} relations`);

      // Si el motor de IA falló y estamos usando el fallback, notificarlo en la respuesta.
      if (result.meta?.engine === 'fallback-mock' && result.meta?.error) {
        return res.status(502).json({ error: 'AI provider failed', details: result.meta.error, diagram: result.diagram, meta: result.meta });
      }

      // Se espera que result contenga { diagram, meta }
      return res.json({ diagram: result.diagram, meta: result.meta || { engine: 'llm' } });
    } catch (error) {
      console.error('[parseController] Error processing image:', error);
      return res.status(500).json({ error: 'Error processing image', details: error.message });
    }
  }
};

module.exports = parseController;
