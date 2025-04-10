"use client"
import React from 'react';
import { Paper, Grid, Typography, Button, Box, Container } from '@mui/material';
import { useRouter } from 'next/navigation';

const WelcomePage = () => {
    const router = useRouter();

    const handleEnterClick = () => {
        router.push('/crows');
    };

    return (
        <Box sx={{ width: 1, height: 1, overflow: 'auto' }}>
            <Container>
                <Grid container spacing={4} justifyContent="center" alignItems="center" sx={{ minHeight: '80vh' }}>
                    <Grid item xs={6}>
                        <Paper elevation={3} sx={{ padding: 4, textAlign: 'center', minWidth: 250, boxShadow: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h4" gutterBottom>
                                Welcome to
                            </Typography>
                            <Typography variant="h3" fontWeight="bold">
                                Connections
                            </Typography>
                            <Typography variant="h3" fontWeight="bold">
                                &
                            </Typography>
                            <Typography variant="h3" fontWeight="bold">
                                Directions
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6}>
                        <Paper elevation={3} sx={{ padding: 4, maxWidth: 400, boxShadow: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography>
                                Connections & Directions is a free diagramming website that allows students to create ERD diagrams using Chen's and Crow's foot notation. Created by Nicholas Hartog and Sebastian Paulis, we guarantee the diagrams are accurate to their notation style for academic use by professors. Freely hosted on Firebase, anyone can use this service without any fear. Users can store their diagrams online or download them locally for use in classes or shared online. Feel free to reach out and contact us!
                            </Typography>
                            <Button variant="contained" color="primary" sx={{ marginTop: 2, backgroundColor: '#1976d2' }} onClick={handleEnterClick}>
                                Enter
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>

                {/* New Section Below */}
                <Box sx={{ marginTop: 6 }}>
                    <Grid container spacing={4} justifyContent="center">
                        <Grid item xs={5}>
                            <Paper elevation={3} sx={{ padding: 4 }}>
                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    Chen's Notation
                                </Typography>
                                <Typography>
                                    Chens Notation llll  llllll lllll lllll llllll lllllll lllllllll ll llll llll lllll llllll lllll lllll ll l lll lll l llll l l l llllllll lll l lllll llll llll ll ll lllll.
                                </Typography>
                                <Typography sx={{ marginTop: 2 }}>
                                    Link to learn more.
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={5}>
                            <Paper elevation={3} sx={{ padding: 4 }}>
                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    Crow's Foot Notation
                                </Typography>
                                <Typography>
                                    Crow's Foot Notation llll  llllll lllll lllll llllll lllllll lllllllll ll llll llll lllll llllll lllll lllll ll l lll lll l llll l l l llllllll lll l lllll llll llll ll ll lllll.
                                </Typography>
                                <Typography sx={{ marginTop: 2 }}>
                                    Link to learn more.
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </Box>
    );
};

export default WelcomePage;
