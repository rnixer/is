import { createFileRoute } from '@tanstack/react-router';
import { fetchMedia } from '../lib/media.server';

export const Route = createFileRoute('/media/$filename')({
  server: {
    handlers: {
      GET: ({ params }) => fetchMedia(params.filename),
    },
  },
});
