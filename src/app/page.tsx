'use client'
import React, { useState } from 'react';
import {Paper, Grid, Typography, Button, Box, Collapse, Container} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRouter } from 'next/navigation';

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

    const handleEnterClick = () => router.push('/crows');

    return (
        <Box sx={{ width: 1, height: 1, overflow: 'auto' }}>
            <Container>
                <Grid container spacing={4} justifyContent="center" alignItems="center" sx={{ minHeight: '50vh', mt: 1 }}>
                    <Grid item xs={5}>
                        <Paper elevation={3} sx={{ padding: 4, textAlign: 'center', height: '100%' }}>
                            <Typography variant="h4" gutterBottom>Welcome to</Typography>
                            <Typography variant="h3" fontWeight="bold">Connections</Typography>
                            <Typography variant="h3" fontWeight="bold">&</Typography>
                            <Typography variant="h3" fontWeight="bold">Directions</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={5}>
                        <Paper elevation={3} sx={{ padding: 4, textAlign: 'center', height: '100%' }}>
                            <Typography>
                                Connections & Directions is a free diagramming website that allows students to create ERD diagrams using Chen's and Crow's foot notation. Created by Nicholas Hartog and Sebastian Paulis, we guarantee the diagrams are accurate to their notation style for academic use by professors. Freely hosted on Firebase, anyone can use this service without any fear.
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Chen and Crow Interactive Cards */}
                <Box sx={{ marginTop: 1 }}>
                    <Grid container spacing={4} justifyContent="center">
                        <Grid item xs={5}>
                            <DiagramBox
                                title="Chen's Notation"
                                description="Chen’s notation uses entities, attributes, and relationships to model data. It’s highly readable and often used in academic settings."
                                route="/chens"
                            />
                        </Grid>
                        <Grid item xs={5}>
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
