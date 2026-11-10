'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  SceneStage,
  useSceneTransitionController,
} from '@/components/canvas/managers/SceneManager';
import type { ViewpointPhotoMoment } from '@/components/canvas/scenes/Scene05_ViewpointStop';
import { DevPhase1BPanel } from '@/components/ui/DevPhase1BPanel';
import { FallbackStorybookView } from '@/components/ui/FallbackStorybookView';
import { ChapterSelectModal } from '@/components/ui/ChapterSelectModal';
import { ControlsTutorialOverlay } from '@/components/ui/ControlsTutorialOverlay';
import { MobileTouchControls } from '@/components/ui/MobileTouchControls';
import { MobileWalkControls } from '@/components/ui/MobileWalkControls';
import { NarrationCard } from '@/components/ui/NarrationCard';
import { NeelkanthHUD } from '@/components/ui/NeelkanthHUD';
import { PauseMenuModal } from '@/components/ui/PauseMenuModal';
import { PrototypeHUD } from '@/components/ui/PrototypeHUD';
import { ScooterReturnModal } from '@/components/ui/ScooterReturnModal';
import { TransitionOverlay } from '@/components/ui/TransitionOverlay';
import { ViewpointHUD } from '@/components/ui/ViewpointHUD';
import { WalkHUD } from '@/components/ui/WalkHUD';
import {
  getActiveChapterKey,
  PHASE2_STORY_CHAPTERS,
  type StoryChapterItem,
} from '@/lib/chapters';
import { useCheckpoint } from '@/hooks/useCheckpoint';
import { useDrivingInput } from '@/hooks/useDrivingInput';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWalkInput, type WalkHotspot } from '@/hooks/useWalkController';
import { ambientAudio } from '@/lib/ambientAudio';
import {
  LEAD_START_DISTANCE,
  VIEWPOINT_RESUME_DISTANCE,
  VIEWPOINT_STOP_DISTANCE,
} from '@/lib/mountainSpline';
import {
  QUALITY_PRESETS,
  detectIsTouchDevice,
} from '@/lib/qualityProfile';
import { selectIsSimulationPaused, useProgressStore } from '@/store/progressStore';

// Configure local self-hosted Draco decoder path once at client entry.
useGLTF.setDecoderPath('/draco/');

export default function Experience() {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [contextLossCount, setContextLossCount] = useState(0);
  const [contextRestoreTimedOut, setContextRestoreTimedOut] = useState(false);
  const [escalatedToFallback, setEscalatedToFallback] = useState(false);

  const [isTouchDevice] = useState<boolean>(() => detectIsTouchDevice());
  const [touchControlsVisible, setTouchControlsVisible] = useState<boolean>(() =>
    detectIsTouchDevice()
  );
  const [arrived, setArrived] = useState(false);
  const [inViewpointZone, setInViewpointZone] = useState(false);
  const [viewpointArrived, setViewpointArrived] = useState(false);
  const [viewpointPullOverNonce, setViewpointPullOverNonce] = useState(0);
  const [trafficWarningVisible, setTrafficWarningVisible] = useState(false);
  const trafficWarnTimerRef = useRef<number | null>(null);
  const [resetNonce, setResetNonce] = useState(0);

  // Viewpoint Photo Pose & Toast state
  const [viewpointPhotoMoment, setViewpointPhotoMoment] = useState<ViewpointPhotoMoment>('none');
  const [viewpointPhotoLabel, setViewpointPhotoLabel] = useState<string | null>(null);
  const [viewpointToastKind, setViewpointToastKind] = useState<'solo' | 'group' | null>(null);
  const viewpointPoseTimerRef = useRef<number | null>(null);
  const viewpointFinishTimerRef = useRef<number | null>(null);
  const viewpointToastTimerRef = useRef<number | null>(null);

  // Scene 6 (Maggi & Chai Stop) lightweight UI interaction state
  const [ateMaggi, setAteMaggi] = useState(false);
  const [sippedChai, setSippedChai] = useState(false);
  const [foodCinematicActive, setFoodCinematicActive] = useState(false);
  const [foodCinematicPlayedThisVisit, setFoodCinematicPlayedThisVisit] = useState(false);
  const [nearbyHotspot, setNearbyHotspot] = useState<WalkHotspot | null>(null);
  const [polaroidToastVisible, setPolaroidToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  // Scene 7 (Neelkanth Mahadev Temple) interaction state
  const [rangBell, setRangBell] = useState(false);
  const [bellSwingImpulseNonce, setBellSwingImpulseNonce] = useState(0);
  const [litDiya, setLitDiya] = useState(false);
  const [hadDarshan, setHadDarshan] = useState(false);
  const [activeDarshanPan, setActiveDarshanPan] = useState(false);
  const [neelkanthToastVisible, setNeelkanthToastVisible] = useState(false);
  const neelkanthDarshanTimerRef = useRef<number | null>(null);
  const neelkanthToastTimerRef = useRef<number | null>(null);

  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [scooterReturnOpen, setScooterReturnOpen] = useState(false);
  const isDevEnvironment = process.env.NODE_ENV === 'development';
  const [devToolsVisible, setDevToolsVisible] = useState(false);

  const reducedMotion = useReducedMotion();
  const qualityProfile = useProgressStore((s) => s.qualityProfile);
  const setQualityProfile = useProgressStore((s) => s.setQualityProfile);
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const userPaused = useProgressStore((s) => s.userPaused);
  const isSimulationPaused = useProgressStore(selectIsSimulationPaused);
  const audioMuted = useProgressStore((s) => s.audioMuted);
  const toggleAudio = useProgressStore((s) => s.toggleAudio);
  const setUserPaused = useProgressStore((s) => s.setUserPaused);
  const setTabHiddenPaused = useProgressStore((s) => s.setTabHiddenPaused);
  const setContextLostPaused = useProgressStore((s) => s.setContextLostPaused);
  const collectedPolaroids = useProgressStore((s) => s.collectedPolaroids);
  const capturePolaroidAndSave = useProgressStore((s) => s.capturePolaroidAndSave);
  const activeNarration = useProgressStore((s) => s.activeNarration);
  const showNarration = useProgressStore((s) => s.showNarration);
  const mountainRoadSegment = useProgressStore((s) => s.mountainRoadSegment);
  const setMountainRoadSegment = useProgressStore((s) => s.setMountainRoadSegment);
  const roadSubStage = useProgressStore((s) => s.roadSubStage);
  const setRoadSubStage = useProgressStore((s) => s.setRoadSubStage);
  const setRoadResumeDistance = useProgressStore((s) => s.setRoadResumeDistance);

  const isDrivingSceneActive = committedSceneId === 5 && roadSubStage === 'driving';
  const isViewpointWalkActive = committedSceneId === 5 && roadSubStage === 'viewpoint_walk';
  const isDhabaWalkActive = committedSceneId === 6;
  const isNeelkanthWalkActive = committedSceneId === 7;
  const isAnyWalkActive = isDhabaWalkActive || isViewpointWalkActive || isNeelkanthWalkActive;
  const capturedDhabaPolaroid = collectedPolaroids.includes('scene06_dhaba');
  const capturedNeelkanthPolaroid = collectedPolaroids.includes('scene07_neelkanth');
  const capturedViewpointSolo = collectedPolaroids.includes('scene05_viewpoint_solo');
  const capturedViewpointGroup = collectedPolaroids.includes('scene05_viewpoint_group');

  // Preserve the initial GL antialias creation flag to avoid remounting the WebGL context.
  const [initialAntialias] = useState<boolean>(
    () => QUALITY_PRESETS[useProgressStore.getState().qualityProfile].antialias
  );

  const speedEl = useRef<HTMLSpanElement>(null);
  const distanceEl = useRef<HTMLSpanElement>(null);
  const gapEl = useRef<HTMLSpanElement>(null);
  const boundaryEl = useRef<HTMLSpanElement>(null);

  const telemetryRefs = useMemo(
    () => ({ speedEl, distanceEl, gapEl, boundaryEl }),
    []
  );

  const handleResetRide = useCallback(() => {
    setResetNonce((prev) => prev + 1);
    setArrived(false);
    setInViewpointZone(false);
    setViewpointArrived(false);
    setTrafficWarningVisible(false);
    if (boundaryEl.current) {
      boundaryEl.current.style.opacity = '0';
    }
  }, []);

  const handleCaptureDhabaPolaroid = useCallback(() => {
    if (useProgressStore.getState().committedSceneId !== 6) return;
    if (useProgressStore.getState().activeNarration !== null) return;

    ambientAudio.playShutterClick();
    const isNew = capturePolaroidAndSave('scene06_dhaba');
    setPolaroidToastVisible(true);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setPolaroidToastVisible(false);
    }, 4500);

    if (isNew) {
      showNarration({
        id: 'scene06-polaroid',
        speaker: 'Dhaba Memory',
        lines: [
          'Snapped a valley dhaba Polaroid! Saved to your memories.',
        ],
      });
    }
  }, [capturePolaroidAndSave, showNarration]);

  const sceneController = useSceneTransitionController();
  const clearInputsRef = useRef<() => void>(() => {});

  const handleResumeRidingFromViewpoint = useCallback(() => {
    clearInputsRef.current();
    sceneController.requestRoadSubStageTransition('driving', {
      roadSegment: 'to_dhaba',
      resumeDistance: VIEWPOINT_RESUME_DISTANCE,
      clearInputs: clearInputsRef.current,
    });
  }, [sceneController]);

  const triggerViewpointPhoto = useCallback(
    (kind: 'solo' | 'group') => {
      const store = useProgressStore.getState();
      if (store.committedSceneId !== 5 || store.roadSubStage !== 'viewpoint_walk') return;
      if (viewpointPhotoMoment !== 'none') return;

      clearInputsRef.current();
      if (viewpointPoseTimerRef.current !== null) window.clearTimeout(viewpointPoseTimerRef.current);
      if (viewpointFinishTimerRef.current !== null) window.clearTimeout(viewpointFinishTimerRef.current);
      if (viewpointToastTimerRef.current !== null) window.clearTimeout(viewpointToastTimerRef.current);

      setViewpointPhotoMoment(kind);
      setViewpointPhotoLabel(
        kind === 'solo'
          ? 'Pausing quietly above the Rishikesh hills...'
          : 'Everyone squeezed in together by the overlook rail...'
      );

      const snapDelay = reducedMotion ? 140 : 900;
      const holdDelay = reducedMotion ? 240 : 850;

      viewpointPoseTimerRef.current = window.setTimeout(() => {
        viewpointPoseTimerRef.current = null;
        ambientAudio.playShutterClick();
        capturePolaroidAndSave(
          kind === 'solo' ? 'scene05_viewpoint_solo' : 'scene05_viewpoint_group'
        );
        setViewpointToastKind(kind);

        viewpointToastTimerRef.current = window.setTimeout(() => {
          viewpointToastTimerRef.current = null;
          setViewpointToastKind(null);
        }, 4500);

        viewpointFinishTimerRef.current = window.setTimeout(() => {
          viewpointFinishTimerRef.current = null;
          setViewpointPhotoMoment('none');
          setViewpointPhotoLabel(null);
        }, holdDelay);
      }, snapDelay);
    },
    [capturePolaroidAndSave, reducedMotion, viewpointPhotoMoment]
  );

  const handleContinueRidingFromDhaba = useCallback(() => {
    clearInputsRef.current();
    setMountainRoadSegment('to_neelkanth');
    setRoadSubStage('driving');
    setRoadResumeDistance(LEAD_START_DISTANCE);
    sceneController.requestSceneTransition(5, {
      clearInputs: clearInputsRef.current,
    });
  }, [sceneController, setMountainRoadSegment, setRoadResumeDistance, setRoadSubStage]);

  const handleFoodCinematicComplete = useCallback(() => {
    setFoodCinematicActive(false);
    setAteMaggi(true);
    setSippedChai(true);
    showNarration({
      id: 'scene06-maggi-complete',
      speaker: 'Maggi & Chai Stop',
      lines: [
        'Pahaadon ki thandi hawa, garma-garam Maggi aur chai... aur saath mein apne log.',
      ],
    });
  }, [showNarration]);

  const handleDhabaInteract = useCallback(() => {
    if (foodCinematicActive || useProgressStore.getState().activeNarration !== null) return;
    if (!nearbyHotspot) return;

    if (nearbyHotspot.id === 'maggi') {
      if (!foodCinematicPlayedThisVisit) {
        clearInputsRef.current();
        setFoodCinematicPlayedThisVisit(true);
        setFoodCinematicActive(true);
      } else {
        showNarration({
          id: 'scene06-maggi-recheck',
          speaker: 'Maggi & Chai Stop',
          lines: [
            'Steaming bowls and kulhad chai finished together — head back to the parked scooters when ready to ride on.',
          ],
        });
      }
      return;
    }

    if (nearbyHotspot.id === 'chai') {
      setSippedChai(true);
      showNarration({
        id: 'scene06-chai',
        speaker: 'Mountain Chai',
        lines: [
          'Pahaadon ki thandi hawa, garma-garam Maggi aur chai... aur saath mein apne log.',
        ],
      });
      return;
    }

    if (nearbyHotspot.id === 'polaroid') {
      handleCaptureDhabaPolaroid();
      return;
    }

    if (nearbyHotspot.id === 'scooters') {
      handleContinueRidingFromDhaba();
    }
  }, [
    foodCinematicActive,
    foodCinematicPlayedThisVisit,
    handleCaptureDhabaPolaroid,
    handleContinueRidingFromDhaba,
    nearbyHotspot,
    showNarration,
  ]);

  const handleCaptureNeelkanthPolaroid = useCallback(() => {
    if (useProgressStore.getState().committedSceneId !== 7) return;
    if (useProgressStore.getState().activeNarration !== null || activeDarshanPan) return;

    ambientAudio.playShutterClick();
    const isNew = capturePolaroidAndSave('scene07_neelkanth');
    setNeelkanthToastVisible(true);
    if (neelkanthToastTimerRef.current !== null) {
      window.clearTimeout(neelkanthToastTimerRef.current);
    }
    neelkanthToastTimerRef.current = window.setTimeout(() => {
      neelkanthToastTimerRef.current = null;
      setNeelkanthToastVisible(false);
    }, 4500);

    if (isNew) {
      showNarration({
        id: 'scene07-polaroid',
        speaker: 'Temple Memory',
        lines: [
          'Captured a Polaroid at Neelkanth Mahadev Temple courtyard! Saved to your memories.',
        ],
      });
    }
  }, [activeDarshanPan, capturePolaroidAndSave, showNarration]);

  const handleNeelkanthInteract = useCallback(() => {
    if (useProgressStore.getState().activeNarration !== null || activeDarshanPan) return;
    if (!nearbyHotspot) return;

    if (nearbyHotspot.id === 'bell') {
      setRangBell(true);
      setBellSwingImpulseNonce((n) => n + 1);
      ambientAudio.playTempleBell();
      showNarration({
        id: 'scene07-bell',
        speaker: 'Brass Temple Bell',
        lines: [
          'The deep chime of the brass bell echoes gently across the mountain valley courtyard.',
        ],
      });
      return;
    }

    if (nearbyHotspot.id === 'diya') {
      setLitDiya(true);
      ambientAudio.playDiyaChime();
      showNarration({
        id: 'scene07-diya',
        speaker: 'Diya Stand',
        lines: [
          'You light an oil diya at the stand — warm golden light glows beneath the mandapa.',
        ],
      });
      return;
    }

    if (nearbyHotspot.id === 'darshan') {
      clearInputsRef.current();
      setActiveDarshanPan(true);
      ambientAudio.playHarHarMahadevChant();
      if (neelkanthDarshanTimerRef.current !== null) {
        window.clearTimeout(neelkanthDarshanTimerRef.current);
      }
      neelkanthDarshanTimerRef.current = window.setTimeout(
        () => {
          neelkanthDarshanTimerRef.current = null;
          setActiveDarshanPan(false);
          setHadDarshan(true);
          showNarration({
            id: 'scene07-darshan',
            speaker: 'Neelkanth Darshan',
            lines: [
              'Der se hi sahi, par Neelkanth Mahadev ke darshan ho hi gaye — Kumbhkaran ki neend ke baad bhi.',
            ],
          });
        },
        reducedMotion ? 320 : 2350
      );
      return;
    }

    if (nearbyHotspot.id === 'polaroid') {
      handleCaptureNeelkanthPolaroid();
      return;
    }

    if (nearbyHotspot.id === 'scooters') {
      clearInputsRef.current();
      setScooterReturnOpen(true);
    }
  }, [
    activeDarshanPan,
    handleCaptureNeelkanthPolaroid,
    nearbyHotspot,
    reducedMotion,
    showNarration,
  ]);

  const handleWalkInteract = useCallback(() => {
    if (isViewpointWalkActive) {
      if (!nearbyHotspot || viewpointPhotoMoment !== 'none') return;
      if (nearbyHotspot.id === 'viewpoint_solo') {
        triggerViewpointPhoto('solo');
      } else if (nearbyHotspot.id === 'viewpoint_group') {
        triggerViewpointPhoto('group');
      } else if (nearbyHotspot.id === 'scooters') {
        handleResumeRidingFromViewpoint();
      }
      return;
    }
    if (isNeelkanthWalkActive) {
      handleNeelkanthInteract();
      return;
    }
    handleDhabaInteract();
  }, [
    handleDhabaInteract,
    handleNeelkanthInteract,
    handleResumeRidingFromViewpoint,
    isNeelkanthWalkActive,
    isViewpointWalkActive,
    nearbyHotspot,
    triggerViewpointPhoto,
    viewpointPhotoMoment,
  ]);

  const handleWalkPhoto = useCallback(() => {
    if (nearbyHotspot?.actionType !== 'photo') return;

    if (isViewpointWalkActive) {
      if (nearbyHotspot.id === 'viewpoint_group') {
        triggerViewpointPhoto('group');
      } else if (nearbyHotspot.id === 'viewpoint_solo') {
        triggerViewpointPhoto('solo');
      }
      return;
    }
    if (isNeelkanthWalkActive) {
      handleCaptureNeelkanthPolaroid();
      return;
    }
    if (isDhabaWalkActive) {
      handleCaptureDhabaPolaroid();
    }
  }, [
    handleCaptureDhabaPolaroid,
    handleCaptureNeelkanthPolaroid,
    isDhabaWalkActive,
    isNeelkanthWalkActive,
    isViewpointWalkActive,
    nearbyHotspot,
    triggerViewpointPhoto,
  ]);

  const anyModalOpen = chaptersOpen || controlsOpen || scooterReturnOpen;

  const drivingInputEnabled =
    isDrivingSceneActive &&
    transitionPhase === 'idle' &&
    !userPaused &&
    !contextLost &&
    !anyModalOpen;
  const walkInputEnabled =
    isAnyWalkActive &&
    transitionPhase === 'idle' &&
    !userPaused &&
    !contextLost &&
    !anyModalOpen &&
    activeNarration === null &&
    viewpointPhotoMoment === 'none' &&
    !activeDarshanPan &&
    !foodCinematicActive;

  const { inputRef, clearAllInputs, setMoveZoneControl, setActionZoneControl } =
    useDrivingInput(handleResetRide, drivingInputEnabled);

  const {
    walkInputRef,
    clearAllWalkInputs,
    setWalkMoveTouch,
    handleOrbitDragStart,
    handleOrbitDragMove,
    handleOrbitDragEnd,
  } = useWalkInput({
    enabled: walkInputEnabled,
    onInteractRequested: handleWalkInteract,
    onPhotoRequested: handleWalkPhoto,
  });

  const clearAllMovementInputs = useCallback(() => {
    clearAllInputs();
    clearAllWalkInputs();
  }, [clearAllInputs, clearAllWalkInputs]);

  useEffect(() => {
    clearInputsRef.current = clearAllMovementInputs;
  }, [clearAllMovementInputs]);

  const requestCheckpointTransition = useCallback(
    (targetId: typeof committedSceneId) => {
      sceneController.requestSceneTransition(targetId, {
        clearInputs: clearAllMovementInputs,
      });
    },
    [clearAllMovementInputs, sceneController]
  );

  const handleContinueToDhaba = useCallback(() => {
    sceneController.requestSceneTransition(6, {
      clearInputs: clearAllMovementInputs,
    });
  }, [clearAllMovementInputs, sceneController]);

  const handleEnterNeelkanthTemple = useCallback(() => {
    sceneController.requestSceneTransition(7, {
      clearInputs: clearAllMovementInputs,
    });
  }, [clearAllMovementInputs, sceneController]);

  const handleReturnToRoadFromNeelkanth = useCallback(() => {
    clearInputsRef.current();
    setMountainRoadSegment('to_neelkanth');
    setRoadSubStage('driving');
    setRoadResumeDistance(LEAD_START_DISTANCE);
    sceneController.requestSceneTransition(5, {
      clearInputs: clearInputsRef.current,
    });
  }, [sceneController, setMountainRoadSegment, setRoadResumeDistance, setRoadSubStage]);

  const handlePullOverAtViewpoint = useCallback(() => {
    setViewpointPullOverNonce((prev) => prev + 1);
  }, []);

  const handleEnterViewpoint = useCallback(() => {
    sceneController.requestRoadSubStageTransition('viewpoint_walk', {
      roadSegment: 'to_dhaba',
      resumeDistance: VIEWPOINT_STOP_DISTANCE,
      clearInputs: clearAllMovementInputs,
    });
  }, [clearAllMovementInputs, sceneController]);

  const handleContinuePastViewpoint = useCallback(() => {
    sceneController.requestRoadSubStageTransition('driving', {
      roadSegment: 'to_dhaba',
      resumeDistance: VIEWPOINT_RESUME_DISTANCE,
      clearInputs: clearAllMovementInputs,
    });
  }, [clearAllMovementInputs, sceneController]);

  const handleReplayPreDhabaSegment = useCallback(() => {
    clearAllMovementInputs();
    setMountainRoadSegment('to_dhaba');
    setRoadSubStage('driving');
    setRoadResumeDistance(LEAD_START_DISTANCE);
    setResetNonce((prev) => prev + 1);
    setArrived(false);
    setInViewpointZone(false);
    setViewpointArrived(false);
  }, [clearAllMovementInputs, setMountainRoadSegment, setRoadResumeDistance, setRoadSubStage]);

  const handleOpenChapters = useCallback(() => {
    clearAllMovementInputs();
    setScooterReturnOpen(false);
    setUserPaused(false);
    setChaptersOpen(true);
  }, [clearAllMovementInputs, setUserPaused]);

  const handleOpenPause = useCallback(() => {
    clearAllMovementInputs();
    setChaptersOpen(false);
    setControlsOpen(false);
    setScooterReturnOpen(false);
    setUserPaused(true);
  }, [clearAllMovementInputs, setUserPaused]);

  const handleDismissControls = useCallback(() => {
    setControlsOpen(false);
    try {
      window.localStorage.setItem('road_made_us_family_controls_seen', '1');
    } catch {
      // Ignore storage failures in private windows.
    }
  }, []);

  const handleSelectChapter = useCallback(
    (chapter: StoryChapterItem) => {
      clearAllMovementInputs();
      setChaptersOpen(false);
      setUserPaused(false);
      setScooterReturnOpen(false);

      if (chapter.targetSceneId === 5) {
        const seg = chapter.targetSegment ?? 'to_dhaba';
        const sub = chapter.targetSubStage ?? 'driving';
        const resumeDist =
          sub === 'viewpoint_walk' ? VIEWPOINT_STOP_DISTANCE : LEAD_START_DISTANCE;

        if (committedSceneId === 5) {
          if (sub !== roadSubStage || seg !== mountainRoadSegment) {
            sceneController.requestRoadSubStageTransition(sub, {
              roadSegment: seg,
              resumeDistance: resumeDist,
              clearInputs: clearAllMovementInputs,
            });
          } else {
            setMountainRoadSegment(seg);
            setRoadSubStage(sub);
            setRoadResumeDistance(resumeDist);
            setResetNonce((prev) => prev + 1);
            setArrived(false);
            setInViewpointZone(false);
            setViewpointArrived(false);
          }
          return;
        }

        setMountainRoadSegment(seg);
        setRoadSubStage(sub);
        setRoadResumeDistance(resumeDist);
        sceneController.requestSceneTransition(5, {
          clearInputs: clearAllMovementInputs,
        });
        return;
      }

      if (chapter.key === 'maggi_chai_stop') {
        setFoodCinematicActive(false);
        setFoodCinematicPlayedThisVisit(false);
        setAteMaggi(false);
        setSippedChai(false);
      }

      sceneController.requestSceneTransition(chapter.targetSceneId, {
        clearInputs: clearAllMovementInputs,
      });
    },
    [
      clearAllMovementInputs,
      committedSceneId,
      mountainRoadSegment,
      roadSubStage,
      sceneController,
      setMountainRoadSegment,
      setRoadResumeDistance,
      setRoadSubStage,
      setUserPaused,
    ]
  );

  const handleRestartCurrentStretch = useCallback(() => {
    setUserPaused(false);
    const activeKey = getActiveChapterKey(committedSceneId, mountainRoadSegment, roadSubStage);
    const chapter = PHASE2_STORY_CHAPTERS.find((c) => c.key === activeKey);
    if (chapter) {
      handleSelectChapter(chapter);
    } else {
      handleResetRide();
    }
  }, [
    committedSceneId,
    handleResetRide,
    handleSelectChapter,
    mountainRoadSegment,
    roadSubStage,
    setUserPaused,
  ]);

  const {
    pendingResumeCheckpoint,
    continueFromCheckpoint,
    startFreshFromCheckpoint,
    dismissPendingResume,
    saveCheckpoint,
    clearCheckpoint,
  } = useCheckpoint(requestCheckpointTransition);

  const handleTrafficBrush = useCallback(() => {
    setTrafficWarningVisible(true);
    if (trafficWarnTimerRef.current !== null) {
      window.clearTimeout(trafficWarnTimerRef.current);
    }
    trafficWarnTimerRef.current = window.setTimeout(() => {
      trafficWarnTimerRef.current = null;
      setTrafficWarningVisible(false);
    }, 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (trafficWarnTimerRef.current !== null) {
        window.clearTimeout(trafficWarnTimerRef.current);
      }
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      if (viewpointPoseTimerRef.current !== null) window.clearTimeout(viewpointPoseTimerRef.current);
      if (viewpointFinishTimerRef.current !== null) {
        window.clearTimeout(viewpointFinishTimerRef.current);
      }
      if (viewpointToastTimerRef.current !== null) {
        window.clearTimeout(viewpointToastTimerRef.current);
      }
      if (neelkanthDarshanTimerRef.current !== null) {
        window.clearTimeout(neelkanthDarshanTimerRef.current);
      }
      if (neelkanthToastTimerRef.current !== null) {
        window.clearTimeout(neelkanthToastTimerRef.current);
      }
    };
  }, []);

  // Sync procedural Web Audio levels & unlock safely on first user gesture
  useEffect(() => {
    const mode =
      transitionPhase !== 'idle' || escalatedToFallback
        ? 'off'
        : isDrivingSceneActive
          ? 'road'
          : isViewpointWalkActive
            ? 'viewpoint'
            : isDhabaWalkActive
              ? 'dhaba'
              : isNeelkanthWalkActive
                ? 'neelkanth'
                : 'off';

    ambientAudio.syncState({
      muted: audioMuted,
      paused: isSimulationPaused,
      mode,
    });
  }, [
    audioMuted,
    escalatedToFallback,
    isDhabaWalkActive,
    isDrivingSceneActive,
    isNeelkanthWalkActive,
    isSimulationPaused,
    isViewpointWalkActive,
    transitionPhase,
  ]);

  useEffect(() => {
    const handleUnlock = () => ambientAudio.unlock();
    window.addEventListener('pointerdown', handleUnlock, { passive: true });
    window.addEventListener('keydown', handleUnlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, []);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem('road_made_us_family_controls_seen');
      if (seen !== '1') {
        setControlsOpen(true);
      }
      if (isDevEnvironment && window.location.search.includes('dev=1')) {
        setDevToolsVisible(true);
      }
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [isDevEnvironment]);

  // Clear transient scene/sub-stage banners cleanly on switches.
  useEffect(() => {
    setArrived(false);
    setInViewpointZone(false);
    setViewpointArrived(false);
    setTrafficWarningVisible(false);
    setNearbyHotspot(null);
    setPolaroidToastVisible(false);
    setNeelkanthToastVisible(false);
    setActiveDarshanPan(false);
    setFoodCinematicActive(false);
    setFoodCinematicPlayedThisVisit(false);
    if (committedSceneId === 6) {
      setAteMaggi(false);
      setSippedChai(false);
    }
    setScooterReturnOpen(false);
    setViewpointToastKind(null);
    setViewpointPhotoMoment('none');
    setViewpointPhotoLabel(null);
  }, [committedSceneId, roadSubStage]);

  // Independent pause, audio mute & cutscene skip listeners.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const targetTag = (event.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA') {
        return;
      }

      if (event.code === 'KeyM') {
        toggleAudio();
        return;
      }

      if (
        event.code === 'Space' &&
        foodCinematicActive &&
        !userPaused &&
        !anyModalOpen &&
        useProgressStore.getState().transitionPhase === 'idle'
      ) {
        event.preventDefault();
        handleFoodCinematicComplete();
        return;
      }

      if (event.code === 'Escape') {
        if (scooterReturnOpen) {
          setScooterReturnOpen(false);
          return;
        }
        if (chaptersOpen) {
          setChaptersOpen(false);
          return;
        }
        if (controlsOpen) {
          handleDismissControls();
          return;
        }

        const state = useProgressStore.getState();
        if (state.transitionPhase !== 'idle') return;
        const nextPaused = !state.userPaused;
        if (nextPaused) {
          clearAllMovementInputs();
        }
        setUserPaused(nextPaused);
      }
    };

    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      if (hidden) {
        clearAllMovementInputs();
      }
      setTabHiddenPaused(hidden);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    anyModalOpen,
    chaptersOpen,
    clearAllMovementInputs,
    controlsOpen,
    foodCinematicActive,
    handleDismissControls,
    handleFoodCinematicComplete,
    scooterReturnOpen,
    setTabHiddenPaused,
    setUserPaused,
    toggleAudio,
    userPaused,
  ]);

  // Freeze held inputs whenever pause/modal activates or a scene transition starts.
  useEffect(() => {
    if (userPaused || anyModalOpen || transitionPhase !== 'idle') {
      clearAllMovementInputs();
    }
  }, [anyModalOpen, clearAllMovementInputs, transitionPhase, userPaused]);

  // WebGL2 context loss, timeout escalation, and restoration without overriding other pause flags.
  useEffect(() => {
    if (!canvasElement) return;
    let restoreTimer: number | null = null;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      clearAllMovementInputs();
      setContextLost(true);
      setContextRestoreTimedOut(false);
      setContextLostPaused(true);
      setContextLossCount((count) => count + 1);

      restoreTimer = window.setTimeout(() => {
        setContextRestoreTimedOut(true);
      }, 8000);
    };

    const handleContextRestored = () => {
      if (restoreTimer !== null) {
        window.clearTimeout(restoreTimer);
        restoreTimer = null;
      }
      setContextLost(false);
      setContextRestoreTimedOut(false);
      // Only clears contextLostPaused; userPaused / tabHiddenPaused stay intact (§7).
      setContextLostPaused(false);
    };

    canvasElement.addEventListener('webglcontextlost', handleContextLost);
    canvasElement.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      if (restoreTimer !== null) {
        window.clearTimeout(restoreTimer);
      }
      canvasElement.removeEventListener('webglcontextlost', handleContextLost);
      canvasElement.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [canvasElement, clearAllMovementInputs, setContextLostPaused]);

  if (escalatedToFallback || contextLossCount >= 2) {
    return (
      <FallbackStorybookView
        reason={`Graphics context was interrupted on this device (last committed scene: #${committedSceneId}).`}
      />
    );
  }

  const activePreset = QUALITY_PRESETS[qualityProfile];
  const currentChapterTitle =
    PHASE2_STORY_CHAPTERS.find(
      (c) => c.key === getActiveChapterKey(committedSceneId, mountainRoadSegment, roadSubStage)
    )?.title ?? 'Rishikesh Mountain Road';

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      onPointerDown={(event) => {
        if (walkInputEnabled && event.target instanceof HTMLCanvasElement) {
          handleOrbitDragStart(event.pointerId, event.clientX, event.clientY);
        }
      }}
      onPointerMove={(event) => {
        if (walkInputEnabled) {
          handleOrbitDragMove(
            event.pointerId,
            event.clientX,
            event.clientY,
            event.buttons,
            event.pointerType
          );
        }
      }}
      onPointerUp={(event) => handleOrbitDragEnd(event.pointerId)}
      onPointerCancel={(event) => handleOrbitDragEnd(event.pointerId)}
    >
      <Canvas
        dpr={activePreset.dpr}
        shadows={activePreset.shadows}
        camera={{ position: [0, 3.2, 3.0], fov: 53, near: 0.25, far: 460 }}
        gl={{ antialias: initialAntialias, powerPreference: 'high-performance' }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => setCanvasElement(gl.domElement)}
      >
        <SceneStage
          controller={sceneController}
          inputRef={inputRef}
          walkInputRef={walkInputRef}
          resetNonce={resetNonce}
          viewpointPullOverNonce={viewpointPullOverNonce}
          telemetryRefs={telemetryRefs}
          ateMaggi={ateMaggi}
          sippedChai={sippedChai}
          capturedDhabaPolaroid={capturedDhabaPolaroid}
          foodCinematicActive={foodCinematicActive}
          onFoodCinematicComplete={handleFoodCinematicComplete}
          capturedViewpointSolo={capturedViewpointSolo}
          capturedViewpointGroup={capturedViewpointGroup}
          viewpointPhotoMoment={viewpointPhotoMoment}
          rangBell={rangBell}
          bellSwingImpulseNonce={bellSwingImpulseNonce}
          litDiya={litDiya}
          hadDarshan={hadDarshan}
          activeDarshanPan={activeDarshanPan}
          capturedNeelkanthPolaroid={capturedNeelkanthPolaroid}
          onNearbyHotspotChange={setNearbyHotspot}
          onArrivedChange={setArrived}
          onInViewpointZoneChange={setInViewpointZone}
          onViewpointArrivedChange={setViewpointArrived}
          onTrafficBrush={handleTrafficBrush}
        />
      </Canvas>

      {isDrivingSceneActive ? (
        <>
          <PrototypeHUD
            arrived={arrived}
            inViewpointZone={inViewpointZone}
            viewpointArrived={viewpointArrived}
            trafficWarningVisible={trafficWarningVisible}
            roadSegment={mountainRoadSegment}
            polaroidCount={collectedPolaroids.length}
            audioMuted={audioMuted}
            onToggleAudioMute={toggleAudio}
            onOpenChapters={handleOpenChapters}
            onPause={handleOpenPause}
            onResetRide={handleResetRide}
            onPullOverAtViewpoint={handlePullOverAtViewpoint}
            onEnterViewpoint={handleEnterViewpoint}
            onContinuePastViewpoint={handleContinuePastViewpoint}
            onContinueToDhaba={handleContinueToDhaba}
            onEnterNeelkanthTemple={handleEnterNeelkanthTemple}
            onReplayPreDhabaSegment={handleReplayPreDhabaSegment}
            telemetryRefs={telemetryRefs}
          />
          <MobileTouchControls
            visible={
              touchControlsVisible &&
              !contextLost &&
              !userPaused &&
              !anyModalOpen &&
              transitionPhase === 'idle'
            }
            onMoveControl={setMoveZoneControl}
            onActionControl={setActionZoneControl}
          />
        </>
      ) : isViewpointWalkActive ? (
        <>
          <ViewpointHUD
            audioMuted={audioMuted}
            onToggleAudioMute={toggleAudio}
            touchControlsVisible={touchControlsVisible}
            onOpenChapters={handleOpenChapters}
            onPause={handleOpenPause}
            capturedSolo={capturedViewpointSolo}
            capturedGroup={capturedViewpointGroup}
            polaroidCount={collectedPolaroids.length}
            nearbyHotspot={nearbyHotspot}
            activePhotoLabel={viewpointPhotoLabel}
            polaroidToastKind={viewpointToastKind}
            onDismissPolaroidToast={() => setViewpointToastKind(null)}
            onTriggerHotspot={handleWalkInteract}
            onResumeRiding={handleResumeRidingFromViewpoint}
          />
          <MobileWalkControls
            visible={
              touchControlsVisible &&
              !contextLost &&
              !userPaused &&
              !anyModalOpen &&
              transitionPhase === 'idle' &&
              viewpointPhotoMoment === 'none'
            }
            nearbyHotspot={nearbyHotspot}
            onWalkMoveTouch={setWalkMoveTouch}
            onInteract={handleWalkInteract}
            onPhoto={handleWalkPhoto}
          />
        </>
      ) : isDhabaWalkActive ? (
        <>
          <WalkHUD
            audioMuted={audioMuted}
            onToggleAudioMute={toggleAudio}
            touchControlsVisible={touchControlsVisible}
            onOpenChapters={handleOpenChapters}
            onPause={handleOpenPause}
            ateMaggi={ateMaggi}
            sippedChai={sippedChai}
            capturedDhabaPolaroid={capturedDhabaPolaroid}
            polaroidCount={collectedPolaroids.length}
            nearbyHotspot={nearbyHotspot}
            hasActiveNarration={activeNarration !== null}
            foodCinematicActive={foodCinematicActive}
            onSkipFoodCinematic={handleFoodCinematicComplete}
            polaroidToastVisible={polaroidToastVisible}
            onDismissPolaroidToast={() => setPolaroidToastVisible(false)}
            onTriggerHotspot={handleWalkInteract}
            onContinueRiding={handleContinueRidingFromDhaba}
          />
          <MobileWalkControls
            visible={
              touchControlsVisible &&
              !contextLost &&
              !userPaused &&
              !anyModalOpen &&
              !foodCinematicActive &&
              transitionPhase === 'idle'
            }
            nearbyHotspot={nearbyHotspot}
            onWalkMoveTouch={setWalkMoveTouch}
            onInteract={handleWalkInteract}
            onPhoto={handleWalkPhoto}
          />
        </>
      ) : isNeelkanthWalkActive ? (
        <>
          <NeelkanthHUD
            audioMuted={audioMuted}
            onToggleAudioMute={toggleAudio}
            touchControlsVisible={touchControlsVisible}
            onOpenChapters={handleOpenChapters}
            onPause={handleOpenPause}
            rangBell={rangBell}
            litDiya={litDiya}
            hadDarshan={hadDarshan}
            capturedPolaroid={capturedNeelkanthPolaroid}
            polaroidCount={collectedPolaroids.length}
            nearbyHotspot={nearbyHotspot}
            hasActiveNarration={activeNarration !== null}
            activeDarshanPan={activeDarshanPan}
            polaroidToastVisible={neelkanthToastVisible}
            onDismissPolaroidToast={() => setNeelkanthToastVisible(false)}
            onTriggerHotspot={handleWalkInteract}
          />
          <MobileWalkControls
            visible={
              touchControlsVisible &&
              !contextLost &&
              !userPaused &&
              !anyModalOpen &&
              transitionPhase === 'idle' &&
              !activeDarshanPan
            }
            nearbyHotspot={nearbyHotspot}
            onWalkMoveTouch={setWalkMoveTouch}
            onInteract={handleWalkInteract}
            onPhoto={handleWalkPhoto}
          />
        </>
      ) : null}

      <NarrationCard touchControlsVisible={touchControlsVisible} />

      <PauseMenuModal
        open={userPaused && transitionPhase === 'idle' && !contextLost}
        chapterTitle={currentChapterTitle}
        qualityProfile={qualityProfile}
        audioMuted={audioMuted}
        touchControlsVisible={touchControlsVisible}
        canShowDevToggle={isDevEnvironment}
        devToolsVisible={devToolsVisible}
        onToggleDevTools={() => setDevToolsVisible((v) => !v)}
        onChangeQuality={setQualityProfile}
        onToggleAudioMute={toggleAudio}
        onToggleTouchControls={() => setTouchControlsVisible((visible) => !visible)}
        onResume={() => setUserPaused(false)}
        onOpenChapters={handleOpenChapters}
        onOpenControls={() => {
          setUserPaused(false);
          setControlsOpen(true);
        }}
        onRestartStretch={handleRestartCurrentStretch}
      />

      <ChapterSelectModal
        open={chaptersOpen}
        onClose={() => setChaptersOpen(false)}
        onSelectChapter={handleSelectChapter}
      />

      <ControlsTutorialOverlay
        open={controlsOpen && !pendingResumeCheckpoint && transitionPhase === 'idle'}
        isTouchDevice={isTouchDevice}
        onDismiss={handleDismissControls}
      />

      <ScooterReturnModal
        open={scooterReturnOpen && transitionPhase === 'idle'}
        onRideBackOnRoad={() => {
          setScooterReturnOpen(false);
          handleReturnToRoadFromNeelkanth();
        }}
        onOpenChapters={() => {
          setScooterReturnOpen(false);
          setChaptersOpen(true);
        }}
        onKeepExploring={() => setScooterReturnOpen(false)}
      />

      {isDevEnvironment && devToolsVisible && (
        <DevPhase1BPanel
          controller={sceneController}
          touchControlsVisible={touchControlsVisible && (isDrivingSceneActive || isAnyWalkActive)}
          onBeforeTransition={clearAllMovementInputs}
          onSaveCheckpoint={saveCheckpoint}
          onClearCheckpoint={clearCheckpoint}
        />
      )}

      <TransitionOverlay
        controller={sceneController}
        contextLost={contextLost}
        pendingResumeCheckpoint={pendingResumeCheckpoint}
        onContinueCheckpoint={() => continueFromCheckpoint()}
        onStartFresh={startFreshFromCheckpoint}
        onDismissResumePrompt={dismissPendingResume}
      />

      {contextLost && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-slate-950/90 px-6 text-center backdrop-blur-sm">
          <p className="text-sm text-slate-200">
            Graphics paused. Restoring 3D canvas...
          </p>
          {contextRestoreTimedOut && (
            <button
              type="button"
              onClick={() => setEscalatedToFallback(true)}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Switch to 2D Fallback Mode
            </button>
          )}
        </div>
      )}
    </div>
  );
}
