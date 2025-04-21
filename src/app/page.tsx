'use client'
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Button, Box, Collapse, Container, Stack } from '@mui/material';
import Grid from '@mui/material/Grid';
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


const chensDescription = `Chen’s notation uses entities, attributes, and relationships to model data.
It’s highly readable and often used in academic settings. It’s ideal for representing conceptual models
where relationships and entity properties are equally important.`;

const crowsDescription = `Crow’s Foot notation is popular for relational database design.
It uses line-end markers to clearly define cardinality (one-to-one, one-to-many, etc.).
This notation is especially effective for logical/physical database models.`;

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
    image
}: {
    title: string;
    description: string;
    route: string;
    image?: string;
}) => {
    const [hovered, setHovered] = useState(false);
    const router = useRouter();

    return (
        <Paper
            elevation={3}
            sx={{
                width: 1,
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
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {image && (
                        <Box
                            component="img"
                            src={image}
                            alt={title}
                            sx={{ maxWidth: '80%', maxHeight: 100, mb: 2, objectFit: 'contain' }}
                        />
                    )}
                    <Typography sx={{ mb: 1, textAlign: 'center' }}>{description}</Typography>
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
                if (prev.length >= 100) { // adjust this cap as needed
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
            <Container sx={{ height: 1 }}>
                <Stack direction='column' sx={{ width: 1, height: 1 }} justifyContent="center">
                    <Grid container spacing={4} sx={{ mt: 4 }}>
                        <Grid size={6}>
                            <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
                                <Typography variant="h4" gutterBottom>Welcome to</Typography>
                                <Typography variant="h3" fontWeight="bold">Connections</Typography>
                                <Typography variant="h3" fontWeight="bold">&</Typography>
                                <Typography variant="h3" fontWeight="bold">Directions</Typography>
                            </Paper>
                        </Grid>
                        <Grid size={6}>
                            <Paper elevation={3} sx={{ padding: 4, textAlign: 'center', height: 1 }}>
                                <Stack direction='column' sx={{ width: 1, height: 1 }} justifyContent="space-between">
                                    <Typography>
                                        Connections & Directions is a free diagramming website that allows students to create ERD diagrams using Chen's and Crow's foot notation. Created by Nicholas Hartog and Sebastian Paulis, we guarantee the diagrams are accurate to their notation style for academic use by professors. Freely hosted on Firebase, anyone can use this service without any fear.
                                    </Typography>
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid size={6} minHeight={200}>
                            <DiagramBox
                                title="Chen's Notation"
                                description= {chensDescription}
                                route="/chens"
                                image="/diagram_imgs/chens.svg"
                            />
                        </Grid>
                        <Grid size={6} minHeight={200}>
                            <DiagramBox
                                title="Crow's Foot Notation"
                                description={crowsDescription}
                                route="/crows"
                                image="/diagram_imgs/crows.svg"
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </Container>
        </Box>
    );
}
