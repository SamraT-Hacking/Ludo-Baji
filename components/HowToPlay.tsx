import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { HowToPlayVideo } from '../types';

const HowToPlay: React.FC = () => {
    const [videos, setVideos] = useState<HowToPlayVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideos = async () => {
            if (!supabase) return;
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('how_to_play_videos')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setVideos(data || []);
            } catch (e: any) {
                setError('Could not load video tutorials.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, []);

    const getYoutubeEmbedUrl = (url: string): string | null => {
        let videoId = null;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v');
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        } catch (e) {
            return null; // Invalid URL
        }
    };

    return (
        <div>
            <h1 style={{ padding: '0 1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: 0 }}>
                How to Play
            </h1>
            <div className="how-to-play-container">
                {loading && <p>Loading videos...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {!loading && videos.length === 0 && (
                    <p style={{ color: 'var(--text-gray)', textAlign: 'center' }}>
                        No video tutorials available at the moment.
                    </p>
                )}
                {videos.map(video => {
                    const embedUrl = getYoutubeEmbedUrl(video.youtube_url);
                    if (!embedUrl) return null;

                    return (
                        <div key={video.id} className="video-card">
                            <h2 className="video-card-title">{video.title}</h2>
                            <div className="video-embed-container">
                                <iframe
                                    src={embedUrl}
                                    title={video.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HowToPlay;
