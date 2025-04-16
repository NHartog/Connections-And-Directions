'use client'
import React, { useState, useEffect } from 'react';
import {Paper, Grid, Typography, Button, Box, Collapse, Container} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRouter } from 'next/navigation';

const floatImages = [
    '/diagram_imgs/img_1.png',
    '/diagram_imgs/img_2.png',
    '/diagram_imgs/img_3.png',
    '/diagram_imgs/img_4.png',
    '/diagram_imgs/img_5.png',
    '/diagram_imgs/img_6.png',
    '/diagram_imgs/img_7.png',
    '/diagram_imgs/img_8.png',
    '/diagram_imgs/img_9.png',
    '/diagram_imgs/img_10.png',
    '/diagram_imgs/img_11.png',
    '/diagram_imgs/img_12.png',
    '/diagram_imgs/img_13.png',
    '/diagram_imgs/img_14.png',
    '/diagram_imgs/img_15.png',
];


const getRandom = (min: number, max: number) => Math.random() * (max - min) + min;

const FloatingImage = ({
                           src,
                           onReady
                       }: {
    src: string;
    onReady?: () => void;
}) => {
    const [style, setStyle] = useState<React.CSSProperties | null>(null);

    useEffect(() => {
        const size = getRandom(40, 100);
        const left = getRandom(0, 100);
        const duration = getRandom(8, 20);
        const delay = getRandom(0, 3);

        setStyle({
            position: 'absolute',
            bottom: `-${size}px`,
            left: `${left}vw`,
            width: `${size}px`,
            animation: `floatUp ${duration}s linear ${delay}s infinite`,
            zIndex: -1,
            opacity: 0.8,
            pointerEvents: 'none',
        });

        // Mark this image as "ready" once styles are set
        onReady?.();
    }, [onReady]);

    if (!style) return null;
    return <Box component="img" src={src} alt="floating" sx={style} />;
};


const DiagramBox = ({
                        title,
                        description,
                        route,
                    }: {
    title: string;
    description: string;
    route: string;
}) => {
    const [hovered, setHovered] = useState(false);
    const router = useRouter();

    return (
        <Paper
            elevation={3}
            sx={{
                width: '100%',
                maxWidth: 500,
                overflow: 'hidden',
                textAlign: 'center',
                padding: 1,
                cursor: 'pointer',
                transition: 'box-shadow 0.3s ease',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Always visible */}
            <Typography variant="h6" fontWeight="bold">
                {title}
            </Typography>
            <ExpandMoreIcon
                sx={{
                    transform: hovered ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                }}
            />

            {/* Smooth expansion via Collapse */}
            <Collapse in={hovered} timeout={300}>
                <Box sx={{ mt: 1 }}>
                    <Typography sx={{ mb: 1 }}>{description}</Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => router.push(route)}
                        sx={{ mb: 0 }}
                    >
                        Create {title} Diagram
                    </Button>
                </Box>
            </Collapse>
        </Paper>
    );
};


export default function WelcomePage() {
    const router = useRouter();
    const [activeImages, setActiveImages] = useState<string[]>([]);
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveImages(prev => {
                if (prev.length >= 1000) { // adjust this cap as needed
                    clearInterval(interval);
                    return prev;
                }
                const src = floatImages[Math.floor(Math.random() * floatImages.length)];
                return [...prev, src];
            });
        }, 1); // images appear ~ every 150ms

        return () => clearInterval(interval);
    }, []);

    const handleEnterClick = () => router.push('/crows');

    return (
        <Box sx={{ width: 1, height: 1, overflow: 'hidden', position: 'relative' }}>
            {/* Floating background images */}
            {activeImages.map((src, i) => (
                <FloatingImage key={i} src={src} />
            ))}
            <Container>
                <Grid container spacing={4} justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
                    <Grid item xs={6}>
                        <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
                            <Typography variant="h4" gutterBottom>Welcome to</Typography>
                            <Typography variant="h3" fontWeight="bold">Connections</Typography>
                            <Typography variant="h3" fontWeight="bold">&</Typography>
                            <Typography variant="h3" fontWeight="bold">Directions</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6}>
                        <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
                            <Typography>
                                Connections & Directions is a free diagramming website that allows students to create ERD diagrams using Chen's and Crow's foot notation. Created by Nicholas Hartog and Sebastian Paulis, we guarantee the diagrams are accurate to their notation style for academic use by professors. Freely hosted on Firebase, anyone can use this service without any fear.
                            </Typography>
                            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleEnterClick}>
                                Enter
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4 }}>
                    <Grid container spacing={4} justifyContent="center">
                        <Grid item xs={6}>
                            <DiagramBox
                                title="Chen's Notation"
                                description="Chen’s notation uses entities, attributes, and relationships to model data. It’s highly readable and often used in academic settings."
                                route="/chens"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <DiagramBox
                                title="Crow's Foot Notation"
                                description="Crow’s Foot notation is popular for relational database design and uses symbols to denote cardinality and relationship types."
                                route="/crows"
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </Box>
    );
}
