'use client'
import {
    Box,
    Button,
    Drawer,
    TextField,
    IconButton,
    Typography,
    Paper,
    ListItem,
    List,
    Select,
    Stack
} from '@mui/material';
import { dia, shapes, elementTools, highlighters } from '@joint/core';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import $ from "jquery";
import CloseIcon from '@mui/icons-material/Close';

export default function CrowsNotation() {
    const [paper, setPaper] = useState<dia.Paper>()
    const [graph, setGraph] = useState<dia.Graph>()
    const [panningEnabled, setPanningEnabled] = useState<boolean>(true)
    const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null)
    const boxWrapperRef = useRef<HTMLElement>(null)
    const selectedCells = useRef<dia.Cell[]>([])
    const width = 8000
    const height = 8000
    const elementWidth = 200
    const elementHeight = 100

    const [open, setOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<dia.Element | null>(null);
    const [entityName, setEntityName] = useState("");
    const [attributes, setAttributes] = useState<string[]>([]);

    useEffect(() => {
        const namespace = shapes;
        const graph = new dia.Graph({}, { cellNamespace: namespace });
        setGraph(graph);

        const paper = new dia.Paper({
            el: document.getElementById('crows_foot_graph'),
            model: graph,
            width: width,
            height: height - 50, // Adjust height to avoid cutting into the layout header
            gridSize: 10,
            drawGrid: { color: '#c9c9c9', thickness: 1, name: 'mesh' },
            interactive: true,
            background: { color: '#F5F5F5' },
            cellViewNamespace: namespace
        });

        paper.on('blank:pointerclick', () =>{
            setSelectedEntity(null);
            setEntityName("");
            setAttributes([]);

            highlighters.mask.removeAll(paper);

        })

        paper.on('element:pointerclick', (elementView) => {
            const highlightId = 'my-element-highlight';
            const isHighlighted = highlighters.mask.get(elementView, highlightId);

            highlighters.mask.removeAll(paper);
            console.log(selectedEntity)
            console.log(elementView)

            if (selectedEntity?.id === elementView.model.id) {
                // If clicking on the same entity, deselect it

                setSelectedEntity(null);
                setEntityName("");
                setAttributes([]);
                highlighters.mask.removeAll(paper);
            }
            else {
                // Select new entity
                setSelectedEntity(elementView.model);
                console.log(elementView.model)
                setEntityName(elementView.model.attr('headerText/text') || "");
                setAttributes(elementView.model.attr('bodyText/text')?.split('\n') || []);

                highlighters.mask.add(elementView, { selector: 'root' }, 'selection-highlight', {
                    deep: true,
                    attrs: {
                        'stroke': '#FF4365',
                        'stroke-width': 3
                    }
                });

            }

        });

        setPaper(paper);
    }, []); // <-- Removed selectedEntity from dependency array




    const addEntity = () => {
        if (graph && paper) {
            const entity = new shapes.standard.HeaderedRectangle();
            entity.position(width / 2 - elementWidth / 2, height / 2 - elementHeight / 2);
            entity.resize(elementWidth, elementHeight * (1 + (0.1 * attributes.length)));

            setSelectedEntity(entity);
            setAttributes(entity.attr('bodyText/text')?.split('\n') || []);
            highlighters.mask.removeAll(paper);

            entity.addTo(graph);
            const entityView = entity.findView(paper);


            highlighters.mask.add(entityView, { selector: 'root' }, 'selection-highlight', {
                deep: true,
                attrs: {
                    'stroke': '#FF4365',
                    'stroke-width': 3
                }
            });
            console.log(entity)
            console.log(entityView)


            const attrText = attributes.join("\n");
            entity.attr('headerText/text', name);
            entity.attr('headerText/fontSize', 20);
            entity.attr('headerText/fontWeight', 'bold');
            entity.attr('header/fill', '#000000');
            entity.attr('header/fillOpacity', 0.1);
            entity.attr('bodyText/text', attrText);
            entity.attr('bodyText/fontSize', 15);
            entity.attr('body/fill', 'rgba(254,133,79,0)');
            entity.attr('body/fillOpacity', 0.5);

            // 1) Create element tools
            const boundaryTool = new elementTools.Boundary();
            const removeButton = new elementTools.Remove();

            // 2) Create tools view
            const toolsView = new dia.ToolsView({
                name: 'basic-tools',
                tools: [boundaryTool, removeButton]
            });



            // 3) Attach the tools to the original shape's view
            const shapeView = entity.findView(paper);
            shapeView.addTools(toolsView);
            shapeView.hideTools(); // Hide the tools


            // 4) Show tools when mouse enters the original shape
            (shapeView.$el as JQuery).on('mouseenter', () => {
                shapeView.showTools() // Ensure tools are shown
            });

            (shapeView.$el as JQuery).on('mouseleave', () => {
                rectElement.css('pointer-events', 'all');
            });

            //// 5) Hide tools when mouse leaves the original shape
            var rectElement = $((toolsView.$el as JQuery)[0].children[0])
            //rectElement.css('pointer-events', 'auto');
            rectElement.on('mouseleave', () => {
                rectElement.css('pointer-events', 'none');
                shapeView.hideTools(); // Hide the tools
            });

            (removeButton.$el as JQuery).on('mouseenter', () => {
                rectElement.css('pointer-events', 'all');
                shapeView.showTools(); // Hide the tools
            });

        }
    };

    const handleSave = () => {
        if (selectedEntity) {
            selectedEntity.attr('headerText/text', entityName);
            selectedEntity.attr('bodyText/text', attributes.join("\n"));
        }
    };

    return (
            <Stack direction="row" sx ={{width: 1, height: 1}}>
                <Box sx = {{width: 'calc(100% - 300px)', height: '100%'}}>
                    <Box sx={{ position: 'fixed', zIndex: 2 }}>
                        <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomIn()}>+</Button>
                        <Button variant="contained" onClick={() => transformWrapperRef.current?.zoomOut()}>-</Button>
                        <Button variant="contained" onClick={() => transformWrapperRef.current?.resetTransform()}>x</Button>
                        <Button variant="contained" onClick={() => transformWrapperRef.current?.centerView()}>o</Button>
                        <Button onClick={addEntity} variant="contained">Add Entity</Button>
                    </Box>
                    <Box sx={{ width: '100%', height: '100%' }} ref={boxWrapperRef}>
                        <TransformWrapper
                            centerOnInit={true}
                            initialPositionX={-width / 2 + (boxWrapperRef.current?.clientWidth || 0) / 2}
                            initialPositionY={-height / 2 + (boxWrapperRef.current?.clientHeight || 0) / 2}
                            doubleClick={{ mode: 'toggle' }}
                            panning={{ disabled: !panningEnabled }}
                            ref={transformWrapperRef}
                        >
                            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                                <Box id="crows_foot_graph"
                                     onMouseDown={(e) => {
                                         const target = e.target as HTMLElement;
                                         if (target.closest('.joint-element')) {
                                             setPanningEnabled(false);
                                         }
                                         if (target.closest('.joint-link')) {
                                             setPanningEnabled(false);
                                         }
                                         if (target.closest('.joint-tool')) {
                                             setPanningEnabled(false);
                                         }
                                     }}
                                     onMouseUp={() => setPanningEnabled(true)}
                                />
                            </TransformComponent>
                        </TransformWrapper>
                    </Box>
                </Box>
                <Paper elevation={3} sx={{ height: '100%', width: '300px'}}>
                    <Box sx = {{padding: 2}}>
                        <Typography variant="h4" sx={{ textAlign: 'center', mb: 2 }}>Entity</Typography>
                        {selectedEntity ? (
                            <>
                                <Typography variant="h6">Settings:</Typography>
                                <TextField label="Name" fullWidth value={entityName} onChange={(e) => setEntityName(e.target.value)} sx={{ mt: 2 }} />
                                <Typography variant="h6" sx={{ mt: 3 }}>Attributes:</Typography>
                                <List>
                                    {attributes.map((attr, index) => (
                                        <ListItem key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                                            <TextField fullWidth value={attr} onChange={(e) => {
                                                const newAttributes = [...attributes];
                                                newAttributes[index] = e.target.value;
                                                setAttributes(newAttributes);
                                            }} />
                                            <IconButton onClick={() => setAttributes(attributes.filter((_, i) => i !== index))}>
                                                <CloseIcon />
                                            </IconButton>
                                        </ListItem>
                                    ))}
                                </List>
                                <Button variant="contained" fullWidth onClick={() => setAttributes([...attributes, "New Attribute"])} sx={{ mt: 2 }}>+ Add Attribute</Button>
                                <Button onClick={handleSave} variant="contained" fullWidth sx={{ mt: 3 }}>Save</Button>
                            </>
                        ) : (
                            <Typography variant="h6" sx={{ textAlign: 'center', mt: 3 }}>Select an entity</Typography>
                        )}
                    </Box>
                </Paper>
            </Stack>

    );
}
