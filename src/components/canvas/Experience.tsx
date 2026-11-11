'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  SceneStage,
  useSceneTransitionController,
} from '@/components/canvas/managers/SceneManager';
import type { Day1Phase } from '@/components/canvas/scenes/Scene02_RishikeshDay1';
import type { ViewpointPhotoMoment } from '@/components/canvas/scenes/Scene05_ViewpointStop';
import type { BhaiDoojPhase } from '@/components/canvas/scenes/Scene13_BhaiDoojFinale';
import { DevPhase1BPanel } from '@/components/ui/DevPhase1BPanel';
import { FallbackStorybookView } from '@/components/ui/FallbackStorybookView';
import { ChapterSelectModal } from '@/components/ui/ChapterSelectModal';
import { ControlsTutorialOverlay } from '@/components/ui/ControlsTutorialOverlay';
import { BaalKuwariHUD } from '@/components/ui/BaalKuwariHUD';
import { BhaiDoojHUD } from '@/components/ui/BhaiDoojHUD';
import { EndingScreenHUD } from '@/components/ui/EndingScreenHUD';
import { HotelReturnHUD } from '@/components/ui/HotelReturnHUD';
import { MobileTouchControls } from '@/components/ui/MobileTouchControls';
import { MobileWalkControls } from '@/components/ui/MobileWalkControls';
import { NarrationCard } from '@/components/ui/NarrationCard';
import { NeelkanthHUD } from '@/components/ui/NeelkanthHUD';
import { PauseMenuModal } from '@/components/ui/PauseMenuModal';
import { PrologueStoryHUD } from '@/components/ui/PrologueStoryHUD';
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
import { useStoryTimers } from '@/hooks/useStoryTimers';
import { useDrivingInput } from '@/hooks/useDrivingInput';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWalkInput, type WalkHotspot } from '@/hooks/useWalkController';
import { ambientAudio } from '@/lib/ambientAudio';
import {
  POLAROID_MEMORY_SPECS,
  getPrivateMediaSessionState,
  usePolaroidMemoryRevision,
} from '@/lib/privateMemoryLoader';
import {
  LEAD_START_DISTANCE,
  VIEWPOINT_RESUME_DISTANCE,
  VIEWPOINT_STOP_DISTANCE,
} from '@/lib/mountainSpline';
import {
  QUALITY_PRESETS,
  detectInitialQualityProfile,
  detectIsTouchDevice,
} from '@/lib/qualityProfile';
import { selectIsSimulationPaused, useProgressStore } from '@/store/progressStore';

// Configure local self-hosted Draco decoder path once at client entry.
useGLTF.setDecoderPath('/draco/');

const QUALITY_RANK: Record<'low' | 'balanced' | 'high', number> = {
  low: 0,
  balanced: 1,
  high: 2,
};

function AdaptiveQualityMonitor() {
  const hardwareCeiling = useMemo(() => detectInitialQualityProfile(), []);
  const metricsRef = useRef({
    frames: 0,
    elapsed: 0,
    lowDuration: 0,
    highDuration: 0,
    cooldownSec: 0,
  });

  useFrame((_, rawDelta) => {
    const state = useProgressStore.getState();
    const m = metricsRef.current;

    if (
      selectIsSimulationPaused(state) ||
      state.transitionPhase !== 'idle' ||
      (typeof document !== 'undefined' && document.hidden)
    ) {
      m.frames = 0;
      m.elapsed = 0;
      return;
    }

    if (rawDelta <= 0 || rawDelta >= 0.25) {
      return;
    }

    m.cooldownSec = Math.max(0, m.cooldownSec - rawDelta);
    m.frames += 1;
    m.elapsed += rawDelta;

    if (m.elapsed < 0.5) {
      return;
    }

    const fps = m.frames / m.elapsed;
    m.frames = 0;
    m.elapsed = 0;

    const current = state.qualityProfile;

    if (fps < 28) {
      m.lowDuration += 0.5;
      m.highDuration = 0;
      if (m.cooldownSec <= 0 && m.lowDuration >= 2.5 && current !== 'low') {
        const nextProfile = current === 'high' ? 'balanced' : 'low';
        state.setQualityProfile(nextProfile);
        m.cooldownSec = 8.0;
        m.lowDuration = 0;
      }
    } else if (fps >= 54) {
      m.lowDuration = 0;
      if (QUALITY_RANK[current] < QUALITY_RANK[hardwareCeiling]) {
        m.highDuration += 0.5;
        if (m.cooldownSec <= 0 && m.highDuration >= 10.0) {
          const nextProfile = current === 'low' ? 'balanced' : 'high';
          if (QUALITY_RANK[nextProfile] <= QUALITY_RANK[hardwareCeiling]) {
            state.setQualityProfile(nextProfile);
            m.cooldownSec = 12.0;
            m.highDuration = 0;
          }
        }
      } else {
        m.highDuration = 0;
      }
    } else {
      m.lowDuration = Math.max(0, m.lowDuration - 0.25);
      m.highDuration = 0;
    }
  });

  return null;
}

export default function Experience() {
  const { setStoryTimeout, clearStoryTimeout, clearStoryTimers } = useStoryTimers();
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

  // Prologue Scenes 1–4 progression state
  const [kitaabiStep, setKitaabiStep] = useState(0);
  const [day1Phase, setDay1Phase] = useState<Day1Phase>('travel_cinematic');
  const [morningBreakfastActive, setMorningBreakfastActive] = useState(false);
  const [morningBreakfastDone, setMorningBreakfastDone] = useState(false);

  // Viewpoint Photo Pose & Toast state
  const [viewpointPhotoMoment, setViewpointPhotoMoment] = useState<ViewpointPhotoMoment>('none');
  const [viewpointPhotoLabel, setViewpointPhotoLabel] = useState<string | null>(null);
  const [viewpointToastKind, setViewpointToastKind] = useState<'shree' | 'solo' | 'group' | null>(null);
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
  const [morningToastVisible, setMorningToastVisible] = useState(false);
  const morningToastTimerRef = useRef<number | null>(null);
  const [neelkanthToastVisible, setNeelkanthToastVisible] = useState(false);
  const neelkanthToastTimerRef = useRef<number | null>(null);
  const neelkanthDarshanTimerRef = useRef<number | null>(null);

  // Scene 8/9/10 (Baal Kuwari Route, Pre-Climb Maggi, ~400 Stairs & Temple) UI state
  const [ateTrailheadMaggi, setAteTrailheadMaggi] = useState(false);
  const [trailheadEatingActive, setTrailheadEatingActive] = useState(false);
  const [summitArrivalCinematicActive, setSummitArrivalCinematicActive] = useState(false);
  const [rangBaalKuwariBell, setRangBaalKuwariBell] = useState(false);
  const [baalKuwariBellNonce, setBaalKuwariBellNonce] = useState(0);
  const [bookPhotoActive, setBookPhotoActive] = useState(false);
  const [baalKuwariToastKind, setBaalKuwariToastKind] = useState<'stairs' | 'summit' | 'book' | null>(null);
  const baalKuwariToastTimerRef = useRef<number | null>(null);
  const bookPhotoPoseTimerRef = useRef<number | null>(null);
  const bookPhotoFinishTimerRef = useRef<number | null>(null);

  const stairStepCountEl = useRef<HTMLSpanElement | null>(null);
  const stairBarFillEl = useRef<HTMLDivElement | null>(null);
  const stairPhaseLabelEl = useRef<HTMLParagraphElement | null>(null);
  const stairFlightEl = useRef<HTMLSpanElement | null>(null);
  const stairTelemetryRefs = useMemo(
    () => ({
      stepCountEl: stairStepCountEl,
      barFillEl: stairBarFillEl,
      phaseLabelEl: stairPhaseLabelEl,
      flightEl: stairFlightEl,
    }),
    []
  );

  // Scene 12 (Rishikesh Hotel Return & Reunion) state
  const [hotelFarewellDone, setHotelFarewellDone] = useState(false);
  const [hotelSummaryOpen, setHotelSummaryOpen] = useState(false);
  const hotelSummaryTimerRef = useRef<number | null>(null);

  // Scene 13 (Virtual Bhai Dooj Finale) state
  const [bhaiDoojPhase, setBhaiDoojPhase] = useState<BhaiDoojPhase>('kitaabi_callback');
  const [bhaiDoojTilakApplied, setBhaiDoojTilakApplied] = useState(false);

  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [chaptersInitialTab, setChaptersInitialTab] = useState<'chapters' | 'memories'>('chapters');
  const [chaptersInitialPolaroid, setChaptersInitialPolaroid] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [scooterReturnOpen, setScooterReturnOpen] = useState(false);
  const isDevEnvironment = process.env.NODE_ENV === 'development';
  const [devToolsVisible, setDevToolsVisible] = useState(false);

  const reducedMotion = useReducedMotion();
  const qualityProfile = useProgressStore((s) => s.qualityProfile);
  const setQualityProfile = useProgressStore((s) => s.setQualityProfile);
  const committedSceneId = useProgressStore((s) => s.committedSceneId);
  const sceneMountToken = useProgressStore((s) => s.sceneMountToken);
  const transitionPhase = useProgressStore((s) => s.transitionPhase);
  const userPaused = useProgressStore((s) => s.userPaused);
  const isSimulationPaused = useProgressStore(selectIsSimulationPaused);
  const audioMuted = useProgressStore((s) => s.audioMuted);
  const musicVolume = useProgressStore((s) => s.musicVolume);
  const sfxVolume = useProgressStore((s) => s.sfxVolume);
  const toggleAudio = useProgressStore((s) => s.toggleAudio);
  const setMusicVolume = useProgressStore((s) => s.setMusicVolume);
  const setSfxVolume = useProgressStore((s) => s.setSfxVolume);
  usePolaroidMemoryRevision();
  const finaleSongUrl = getPrivateMediaSessionState().finaleSongUrl;
  const setUserPaused = useProgressStore((s) => s.setUserPaused);
  const setTabHiddenPaused = useProgressStore((s) => s.setTabHiddenPaused);
  const setContextLostPaused = useProgressStore((s) => s.setContextLostPaused);
  const setModalPaused = useProgressStore((s) => s.setModalPaused);
  const collectedPolaroids = useProgressStore((s) => s.collectedPolaroids);
  const capturePolaroidAndSave = useProgressStore((s) => s.capturePolaroidAndSave);
  const activeNarration = useProgressStore((s) => s.activeNarration);
  const [activeCaption, setActiveCaption] = useState<{
    speaker: string;
    text: string;
  } | null>(null);
  const captionTimerRef = useRef<number | null>(null);

  const showTimedCaption = useCallback(
    (speaker: string, text: string, durationMs = 3200) => {
      if (captionTimerRef.current !== null) {
        clearStoryTimeout(captionTimerRef.current);
      }
      setActiveCaption({ speaker, text });
      captionTimerRef.current = setStoryTimeout(() => {
        captionTimerRef.current = null;
        setActiveCaption(null);
      }, durationMs);
    },
    []
  );
  const mountainRoadSegment = useProgressStore((s) => s.mountainRoadSegment);
  const setMountainRoadSegment = useProgressStore((s) => s.setMountainRoadSegment);
  const roadSubStage = useProgressStore((s) => s.roadSubStage);
  const setRoadSubStage = useProgressStore((s) => s.setRoadSubStage);
  const baalKuwariSubStage = useProgressStore((s) => s.baalKuwariSubStage);
  const setBaalKuwariSubStage = useProgressStore((s) => s.setBaalKuwariSubStage);
  const baalKuwariStairDirection = useProgressStore((s) => s.baalKuwariStairDirection);
  const setBaalKuwariStairDirection = useProgressStore((s) => s.setBaalKuwariStairDirection);
  const setStairStepCount = useProgressStore((s) => s.setStairStepCount);
  const setRoadResumeDistance = useProgressStore((s) => s.setRoadResumeDistance);

  const isKitaabiSceneActive = committedSceneId === 1;
  const isDay1SceneActive = committedSceneId === 2;
  const isDay2MorningActive = committedSceneId === 3;
  const isDepartureSceneActive = committedSceneId === 4;
  const isBaalKuwariDriveActive = committedSceneId === 8 && baalKuwariSubStage === 'driving';
  const isBaalKuwariMaggiActive = committedSceneId === 8 && baalKuwariSubStage === 'maggi_stop';
  const isBaalKuwariStairsDriveActive =
    committedSceneId === 8 && baalKuwariSubStage === 'driving_to_stairs';
  const isBaalKuwariStairsActive = committedSceneId === 9;
  const isBaalKuwariTempleActive = committedSceneId === 10;
  const isSafeReturnDriveActive = committedSceneId === 11;
  const isHotelReturnWalkActive = committedSceneId === 12;
  const isBhaiDoojSceneActive = committedSceneId === 13;
  const isEndingGalleryActive = committedSceneId === 14;

  const isDrivingSceneActive =
    (committedSceneId === 5 && roadSubStage === 'driving') ||
    isBaalKuwariDriveActive ||
    isBaalKuwariStairsDriveActive ||
    isSafeReturnDriveActive;
  const isViewpointWalkActive = committedSceneId === 5 && roadSubStage === 'viewpoint_walk';
  const isDhabaWalkActive = committedSceneId === 6;
  const isNeelkanthWalkActive = committedSceneId === 7;
  const isAnyWalkActive =
    (isDay1SceneActive && day1Phase === 'stay_explore') ||
    isDay2MorningActive ||
    isDhabaWalkActive ||
    isViewpointWalkActive ||
    isNeelkanthWalkActive ||
    isBaalKuwariMaggiActive ||
    isBaalKuwariTempleActive ||
    isHotelReturnWalkActive;
  const validPolaroidCount = collectedPolaroids.filter((id) => id in POLAROID_MEMORY_SPECS).length;
  const capturedDhabaPolaroid = collectedPolaroids.includes('scene06_dhaba');
  const capturedViewpointShree = collectedPolaroids.includes('scene05_viewpoint_shree');
  const capturedViewpointSolo = collectedPolaroids.includes('scene05_viewpoint_solo');
  const capturedViewpointGroup = collectedPolaroids.includes('scene05_viewpoint_group');
  const capturedNeelkanthFood = collectedPolaroids.includes('scene07_neelkanth_food');
  const capturedBaalKuwariPolaroid = collectedPolaroids.includes('scene10_baalkuwari');
  const capturedBaalKuwariBook = collectedPolaroids.includes('scene10_baalkuwari_book');

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
      clearStoryTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setStoryTimeout(() => {
      toastTimerRef.current = null;
      setPolaroidToastVisible(false);
    }, 4500);

    if (isNew) {
      showTimedCaption(
        'Maggi Tapri Yaad',
        'Pahadi tapri waali Polaroid Yaadein mein save ho gayi!',
        2800
      );
    }
  }, [capturePolaroidAndSave, showTimedCaption]);

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
    (kind: 'shree' | 'solo' | 'group') => {
      const store = useProgressStore.getState();
      if (store.committedSceneId !== 5 || store.roadSubStage !== 'viewpoint_walk') return;
      if (viewpointPhotoMoment !== 'none') return;

      clearInputsRef.current();
      if (viewpointPoseTimerRef.current !== null) clearStoryTimeout(viewpointPoseTimerRef.current);
      if (viewpointFinishTimerRef.current !== null) clearStoryTimeout(viewpointFinishTimerRef.current);
      if (viewpointToastTimerRef.current !== null) clearStoryTimeout(viewpointToastTimerRef.current);

      setViewpointPhotoMoment(kind);
      setViewpointPhotoLabel(
        kind === 'shree'
          ? 'Shree — nadi aur ghaati ke mod ke saamne khade hue!'
          : kind === 'solo'
            ? 'Shree & Ishaan — rail ke paas ghaati aur pahadiyan dekhte hue!'
            : 'Sab log rail ke paas saath mein khade hokar photo ke liye!'
      );

      const snapDelay = reducedMotion ? 140 : 900;
      const holdDelay = reducedMotion ? 240 : 850;

      viewpointPoseTimerRef.current = setStoryTimeout(() => {
        viewpointPoseTimerRef.current = null;
        ambientAudio.playShutterClick();
        capturePolaroidAndSave(
          kind === 'shree'
            ? 'scene05_viewpoint_shree'
            : kind === 'solo'
              ? 'scene05_viewpoint_solo'
              : 'scene05_viewpoint_group'
        );
        setViewpointToastKind(kind);

        viewpointToastTimerRef.current = setStoryTimeout(() => {
          viewpointToastTimerRef.current = null;
          setViewpointToastKind(null);
        }, 4500);

        viewpointFinishTimerRef.current = setStoryTimeout(() => {
          viewpointFinishTimerRef.current = null;
          setViewpointPhotoMoment('none');
          setViewpointPhotoLabel(null);
        }, holdDelay);
      }, snapDelay);
    },
    [capturePolaroidAndSave, reducedMotion, viewpointPhotoMoment]
  );

  const handleAdvanceKitaabi = useCallback(() => {
    if (kitaabiStep < 1) {
      setKitaabiStep(1);
    } else {
      clearInputsRef.current();
      setDay1Phase('travel_cinematic');
      sceneController.requestSceneTransition(2, { clearInputs: clearInputsRef.current });
    }
  }, [kitaabiStep, sceneController]);

  const handleDay1Complete = useCallback(() => {
    if (useProgressStore.getState().committedSceneId !== 2) return;
    clearInputsRef.current();
    setMorningBreakfastActive(false);
    setMorningBreakfastDone(false);
    sceneController.requestSceneTransition(3, { clearInputs: clearInputsRef.current });
  }, [sceneController]);

  const handleMorningBreakfastComplete = useCallback(() => {
    setMorningBreakfastActive(false);
    setMorningBreakfastDone(true);
    ambientAudio.playShutterClick();
    capturePolaroidAndSave('scene03_tea_stop');
    setMorningToastVisible(true);
    if (morningToastTimerRef.current !== null) {
      clearStoryTimeout(morningToastTimerRef.current);
    }
    morningToastTimerRef.current = setStoryTimeout(() => {
      morningToastTimerRef.current = null;
      setMorningToastVisible(false);
    }, 4500);
    showTimedCaption(
      'Bun Maska & Chai',
      'Subah ki garma-garam chai aur bun maska ho gaya — ab scooty par Neelkanth ki taraf chalein!',
      3400
    );
  }, [capturePolaroidAndSave, showTimedCaption]);

  const handleScooterDepartureComplete = useCallback(() => {
    if (useProgressStore.getState().committedSceneId !== 4) return;
    clearInputsRef.current();
    setMountainRoadSegment('to_dhaba');
    setRoadSubStage('driving');
    setRoadResumeDistance(LEAD_START_DISTANCE);
    sceneController.requestSceneTransition(5, { clearInputs: clearInputsRef.current });
  }, [sceneController, setMountainRoadSegment, setRoadResumeDistance, setRoadSubStage]);

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
    showTimedCaption(
      'Maggi & Chai Stop',
      'Late start ke baad bhi garma-garam Maggi aur chai saath mein mil gayi — ab aage Neelkanth chalein?',
      3600
    );
  }, [showTimedCaption]);

  const handleDhabaInteract = useCallback(() => {
    if (foodCinematicActive || useProgressStore.getState().activeNarration !== null) return;
    if (!nearbyHotspot) return;

    if (nearbyHotspot.id === 'maggi') {
      if (!foodCinematicPlayedThisVisit) {
        clearInputsRef.current();
        setFoodCinematicPlayedThisVisit(true);
        setFoodCinematicActive(true);
      } else {
        showTimedCaption(
          'Maggi & Chai Stop',
          'Maggi aur kulhad chai ho chuki — jab ready ho, wapas scooty pe chalte hain!',
          2800
        );
      }
      return;
    }

    if (nearbyHotspot.id === 'chai') {
      setSippedChai(true);
      showTimedCaption(
        'Mountain Chai',
        'Pahaadon ki thandi hawa, garma-garam Maggi aur chai... aur saath mein apne log.',
        3200
      );
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
    showTimedCaption,
  ]);

  const handleCaptureNeelkanthFoodPolaroid = useCallback(() => {
    if (useProgressStore.getState().committedSceneId !== 7) return;
    if (useProgressStore.getState().activeNarration !== null || activeDarshanPan) return;

    ambientAudio.playShutterClick();
    const isNew = capturePolaroidAndSave('scene07_neelkanth_food');
    setNeelkanthToastVisible(true);
    if (neelkanthToastTimerRef.current !== null) {
      clearStoryTimeout(neelkanthToastTimerRef.current);
    }
    neelkanthToastTimerRef.current = setStoryTimeout(() => {
      neelkanthToastTimerRef.current = null;
      setNeelkanthToastVisible(false);
    }, 4500);

    if (isNew) {
      showTimedCaption(
        'Meal Outside Neelkanth',
        'Darshan ke baad bazaar ke bahar garma-garam chhole bhature aur lunch yaadein mein save ho gayi!',
        3400
      );
    }
  }, [activeDarshanPan, capturePolaroidAndSave, showTimedCaption]);

  const handleNeelkanthInteract = useCallback(() => {
    if (useProgressStore.getState().activeNarration !== null || activeDarshanPan) return;
    if (!nearbyHotspot) return;

    if (nearbyHotspot.id === 'neelkanth_food') {
      handleCaptureNeelkanthFoodPolaroid();
      return;
    }

    if (nearbyHotspot.id === 'bell') {
      setRangBell(true);
      setBellSwingImpulseNonce((n) => n + 1);
      ambientAudio.playTempleBell();
      showTimedCaption(
        'Mandir ki Ghanti',
        'Neelkanth aangan mein peetal ki ghanti ki aawaaz goonj uthi.',
        2600
      );
      return;
    }

    if (nearbyHotspot.id === 'diya') {
      setLitDiya(true);
      ambientAudio.playDiyaChime();
      showTimedCaption(
        'Diya Stand',
        'Tumne diya jalaya — mandap ke neeche halki si warmth aur roshni.',
        2800
      );
      return;
    }

    if (nearbyHotspot.id === 'darshan') {
      clearInputsRef.current();
      setActiveDarshanPan(true);
      ambientAudio.playHarHarMahadevChant();
      if (neelkanthDarshanTimerRef.current !== null) {
        clearStoryTimeout(neelkanthDarshanTimerRef.current);
      }
      neelkanthDarshanTimerRef.current = setStoryTimeout(
        () => {
          neelkanthDarshanTimerRef.current = null;
          setActiveDarshanPan(false);
          setHadDarshan(true);
          showTimedCaption(
            'Neelkanth Darshan',
            'Der se hi sahi, par hum sabne Mahadev ke darshan saath mein kiye!',
            3600
          );
        },
        reducedMotion ? 320 : 2350
      );
      return;
    }

    if (nearbyHotspot.id === 'scooters') {
      clearInputsRef.current();
      setScooterReturnOpen(true);
    }
  }, [
    activeDarshanPan,
    handleCaptureNeelkanthFoodPolaroid,
    nearbyHotspot,
    reducedMotion,
    showTimedCaption,
  ]);

  const handleTrailheadMaggiComplete = useCallback(() => {
    setTrailheadEatingActive(false);
    setAteTrailheadMaggi(true);
    showTimedCaption(
      'Roadside Maggi Clearing',
      'Seedhiyon se pehle Maggi break ho gaya — ab wapas scooty pe seedhiyon ke gate tak chalo!',
      3400
    );
  }, [showTimedCaption]);

  const handleCaptureBaalKuwariPolaroid = useCallback(
    (kind: 'stairs' | 'summit' | 'book') => {
      const targetScene = kind === 'stairs' ? 9 : 10;
      if (useProgressStore.getState().committedSceneId !== targetScene) return;
      if (useProgressStore.getState().activeNarration !== null) return;

      ambientAudio.playShutterClick();
      const key =
        kind === 'stairs'
          ? 'scene09_stairs_landing'
          : kind === 'book'
            ? 'scene10_baalkuwari_book'
            : 'scene10_baalkuwari';
      const isNew = capturePolaroidAndSave(key);
      setBaalKuwariToastKind(kind);
      if (baalKuwariToastTimerRef.current !== null) {
        clearStoryTimeout(baalKuwariToastTimerRef.current);
      }
      baalKuwariToastTimerRef.current = setStoryTimeout(() => {
        baalKuwariToastTimerRef.current = null;
        setBaalKuwariToastKind(null);
      }, 4500);

      if (isNew) {
        showTimedCaption(
          kind === 'stairs'
            ? 'Climb Rest Overlook'
            : kind === 'book'
              ? 'With Her Book — Baal Kuwari'
              : 'Baal Kuwari Summit',
          kind === 'stairs'
            ? 'Halfway rest par jungle valley Polaroid memories mein save ho gayi!'
            : kind === 'book'
              ? 'Temple backyard overlook par kitaab ke saath waali Polaroid save ho gayi!'
              : 'Baal Kuwari summit courtyard Polaroid memories mein save ho gayi!',
          3000
        );
      }
    },
    [capturePolaroidAndSave, showTimedCaption]
  );

  const triggerBaalKuwariBookPhoto = useCallback(() => {
    const store = useProgressStore.getState();
    if (store.committedSceneId !== 10 || store.activeNarration !== null || bookPhotoActive) return;

    clearInputsRef.current();
    if (bookPhotoPoseTimerRef.current !== null) clearStoryTimeout(bookPhotoPoseTimerRef.current);
    if (bookPhotoFinishTimerRef.current !== null) clearStoryTimeout(bookPhotoFinishTimerRef.current);

    setBookPhotoActive(true);
    const snapDelay = reducedMotion ? 140 : 880;
    const holdDelay = reducedMotion ? 240 : 900;

    bookPhotoPoseTimerRef.current = setStoryTimeout(() => {
      bookPhotoPoseTimerRef.current = null;
      handleCaptureBaalKuwariPolaroid('book');

      bookPhotoFinishTimerRef.current = setStoryTimeout(() => {
        bookPhotoFinishTimerRef.current = null;
        setBookPhotoActive(false);
      }, holdDelay);
    }, snapDelay);
  }, [bookPhotoActive, handleCaptureBaalKuwariPolaroid, reducedMotion]);

  const handleWalkInteract = useCallback(() => {
    if (isDay1SceneActive && day1Phase === 'stay_explore') {
      if (!nearbyHotspot || useProgressStore.getState().activeNarration !== null) return;
      if (nearbyHotspot.id === 'go_to_terrace') {
        clearInputsRef.current();
        window.dispatchEvent(new CustomEvent('day1:toggle-terrace', { detail: { to: 'up' } }));
      } else if (nearbyHotspot.id === 'back_to_lane') {
        clearInputsRef.current();
        window.dispatchEvent(new CustomEvent('day1:toggle-terrace', { detail: { to: 'down' } }));
      } else if (nearbyHotspot.id === 'day1_scooter_maggi') {
        clearInputsRef.current();
        setDay1Phase('evening_maggi');
      }
      return;
    }
    if (isDay2MorningActive) {
      if (morningBreakfastActive || useProgressStore.getState().activeNarration !== null) return;
      if (!nearbyHotspot) return;
      if (nearbyHotspot.id === 'bun_maska_chai') {
        if (!morningBreakfastDone) {
          clearInputsRef.current();
          setMorningBreakfastActive(true);
        } else {
          showTimedCaption(
            'Bun Maska & Chai',
            'Breakfast ho gaya — chalo ab scooty ke paas chalkar Neelkanth nikalte hain!',
            2800
          );
        }
      } else if (nearbyHotspot.id === 'depart_neelkanth') {
        if (morningBreakfastDone) {
          clearInputsRef.current();
          sceneController.requestSceneTransition(4, { clearInputs: clearInputsRef.current });
        } else {
          showTimedCaption(
            'Morning Tea Stop',
            'Pehle main road stall par chal kar bun maska aur chai saath mein pi lete hain!',
            2800
          );
        }
      }
      return;
    }
    if (isViewpointWalkActive) {
      if (!nearbyHotspot || viewpointPhotoMoment !== 'none') return;
      if (nearbyHotspot.id === 'viewpoint_shree') {
        triggerViewpointPhoto('shree');
      } else if (nearbyHotspot.id === 'viewpoint_solo') {
        triggerViewpointPhoto('solo');
      } else if (nearbyHotspot.id === 'viewpoint_group') {
        triggerViewpointPhoto('group');
      } else if (nearbyHotspot.id === 'scooters') {
        handleResumeRidingFromViewpoint();
      }
      return;
    }
    if (isBaalKuwariMaggiActive) {
      if (trailheadEatingActive || useProgressStore.getState().activeNarration !== null) return;
      if (!nearbyHotspot) return;
      if (nearbyHotspot.id === 'trail_maggi') {
        if (!ateTrailheadMaggi) {
          clearInputsRef.current();
          setTrailheadEatingActive(true);
        } else {
          showTimedCaption(
            'Roadside Maggi Clearing',
            'Pre-climb Maggi finished — head back to your scooters to ride toward the staircase gate.',
            3000
          );
        }
      } else if (nearbyHotspot.id === 'ride_to_stairs') {
        clearInputsRef.current();
        sceneController.requestBaalKuwariSubStageTransition('driving_to_stairs', {
          resumeDistance: LEAD_START_DISTANCE,
          clearInputs: clearInputsRef.current,
        });
      } else if (nearbyHotspot.id === 'back_to_road') {
        clearInputsRef.current();
        sceneController.requestBaalKuwariSubStageTransition('driving', {
          resumeDistance: LEAD_START_DISTANCE,
          clearInputs: clearInputsRef.current,
        });
      }
      return;
    }
    if (isBaalKuwariTempleActive) {
      if (
        summitArrivalCinematicActive ||
        bookPhotoActive ||
        !nearbyHotspot ||
        useProgressStore.getState().activeNarration !== null
      ) {
        return;
      }
      if (nearbyHotspot.id === 'summit_bell') {
        setRangBaalKuwariBell(true);
        setBaalKuwariBellNonce((n) => n + 1);
        ambientAudio.playTempleBell();
      } else if (nearbyHotspot.id === 'summit_polaroid') {
        handleCaptureBaalKuwariPolaroid('summit');
      } else if (nearbyHotspot.id === 'book_polaroid') {
        triggerBaalKuwariBookPhoto();
      } else if (nearbyHotspot.id === 'descent') {
        clearInputsRef.current();
        setBaalKuwariStairDirection('descent');
        setStairStepCount(400);
        sceneController.requestSceneTransition(9, { clearInputs: clearInputsRef.current });
      }
      return;
    }
    if (isHotelReturnWalkActive) {
      if (hotelSummaryOpen || !nearbyHotspot || useProgressStore.getState().activeNarration !== null) {
        return;
      }
      if (nearbyHotspot.id === 'go_to_terrace') {
        clearInputsRef.current();
        window.dispatchEvent(
          new CustomEvent('scene12:toggle-terrace', { detail: { direction: 'up' } })
        );
      } else if (nearbyHotspot.id === 'back_to_lane') {
        clearInputsRef.current();
        window.dispatchEvent(
          new CustomEvent('scene12:toggle-terrace', { detail: { direction: 'down' } })
        );
      } else if (nearbyHotspot.id === 'rejoin_farewell') {
        clearInputsRef.current();
        setHotelFarewellDone(true);
        if (hotelSummaryTimerRef.current !== null) {
          clearStoryTimeout(hotelSummaryTimerRef.current);
        }
        hotelSummaryTimerRef.current = setStoryTimeout(
          () => {
            hotelSummaryTimerRef.current = null;
            setHotelSummaryOpen(true);
          },
          reducedMotion ? 320 : 2100
        );
      }
      return;
    }
    if (isNeelkanthWalkActive) {
      handleNeelkanthInteract();
      return;
    }
    handleDhabaInteract();
  }, [
    ateTrailheadMaggi,
    bookPhotoActive,
    day1Phase,
    handleCaptureBaalKuwariPolaroid,
    handleDhabaInteract,
    handleNeelkanthInteract,
    handleResumeRidingFromViewpoint,
    hotelSummaryOpen,
    isBaalKuwariMaggiActive,
    isBaalKuwariTempleActive,
    isDay1SceneActive,
    isDay2MorningActive,
    isHotelReturnWalkActive,
    isNeelkanthWalkActive,
    isViewpointWalkActive,
    morningBreakfastActive,
    morningBreakfastDone,
    nearbyHotspot,
    reducedMotion,
    sceneController,
    setBaalKuwariStairDirection,
    setStairStepCount,
    showTimedCaption,
    summitArrivalCinematicActive,
    trailheadEatingActive,
    triggerBaalKuwariBookPhoto,
    triggerViewpointPhoto,
    viewpointPhotoMoment,
  ]);

  const handleWalkPhoto = useCallback(() => {
    if (nearbyHotspot?.actionType !== 'photo') return;

    if (isViewpointWalkActive) {
      if (nearbyHotspot.id === 'viewpoint_shree') {
        triggerViewpointPhoto('shree');
      } else if (nearbyHotspot.id === 'viewpoint_group') {
        triggerViewpointPhoto('group');
      } else if (nearbyHotspot.id === 'viewpoint_solo') {
        triggerViewpointPhoto('solo');
      }
      return;
    }
    if (isBaalKuwariTempleActive) {
      if (nearbyHotspot.id === 'book_polaroid') {
        triggerBaalKuwariBookPhoto();
      } else {
        handleCaptureBaalKuwariPolaroid('summit');
      }
      return;
    }
    if (isNeelkanthWalkActive && nearbyHotspot.id === 'neelkanth_food') {
      handleCaptureNeelkanthFoodPolaroid();
      return;
    }
    if (isDhabaWalkActive) {
      handleCaptureDhabaPolaroid();
    }
  }, [
    handleCaptureBaalKuwariPolaroid,
    handleCaptureDhabaPolaroid,
    handleCaptureNeelkanthFoodPolaroid,
    isBaalKuwariTempleActive,
    isDhabaWalkActive,
    isNeelkanthWalkActive,
    isViewpointWalkActive,
    nearbyHotspot,
    triggerBaalKuwariBookPhoto,
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
    !foodCinematicActive &&
    !trailheadEatingActive &&
    !summitArrivalCinematicActive &&
    !bookPhotoActive &&
    !morningBreakfastActive &&
    !hotelSummaryOpen;

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

  const handleRideToBaalKuwari = useCallback(() => {
    clearInputsRef.current();
    setMountainRoadSegment('to_baalkuwari');
    setBaalKuwariSubStage('driving');
    setRoadResumeDistance(LEAD_START_DISTANCE);
    sceneController.requestSceneTransition(8, {
      clearInputs: clearInputsRef.current,
    });
  }, [sceneController, setBaalKuwariSubStage, setMountainRoadSegment, setRoadResumeDistance]);

  const handleEnterBaalKuwariMaggi = useCallback(() => {
    clearInputsRef.current();
    sceneController.requestBaalKuwariSubStageTransition('maggi_stop', {
      clearInputs: clearInputsRef.current,
    });
  }, [sceneController]);

  const handleBeginClimbFromMaggi = useCallback(() => {
    clearInputsRef.current();
    sceneController.requestBaalKuwariSubStageTransition('driving_to_stairs', {
      resumeDistance: LEAD_START_DISTANCE,
      clearInputs: clearInputsRef.current,
    });
  }, [sceneController]);

  const handleEnterStaircaseFromFootpath = useCallback(() => {
    clearInputsRef.current();
    setBaalKuwariStairDirection('ascent');
    setStairStepCount(0);
    sceneController.requestSceneTransition(9, { clearInputs: clearInputsRef.current });
  }, [sceneController, setBaalKuwariStairDirection, setStairStepCount]);

  const handleStairAscentComplete = useCallback(() => {
    if (useProgressStore.getState().committedSceneId !== 9) return;
    clearInputsRef.current();
    setStairStepCount(400);
    capturePolaroidAndSave('scene09_stairs_landing');
    sceneController.requestSceneTransition(10, { clearInputs: clearInputsRef.current });
  }, [capturePolaroidAndSave, sceneController, setStairStepCount]);

  const handleStairDescentComplete = useCallback(() => {
    if (useProgressStore.getState().committedSceneId !== 9) return;
    clearInputsRef.current();
    setMountainRoadSegment('to_hotel_return');
    setRoadResumeDistance(LEAD_START_DISTANCE);
    sceneController.requestSceneTransition(11, { clearInputs: clearInputsRef.current });
  }, [
    sceneController,
    setMountainRoadSegment,
    setRoadResumeDistance,
  ]);

  const handleEnterHotelCourtyard = useCallback(() => {
    clearInputsRef.current();
    sceneController.requestSceneTransition(12, {
      clearInputs: clearInputsRef.current,
    });
  }, [sceneController]);

  const handleSummitArrivalCinematicComplete = useCallback(() => {
    setSummitArrivalCinematicActive(false);
    showTimedCaption(
      'Baal Kuwari Temple',
      '400 seedhiyon ke baad upar ki thandi hawa — ghanti bajao, valley dekho, aur jab ready ho neeche chalte hain!',
      3800
    );
  }, [showTimedCaption]);

  const handleStairHalfwayMilestone = useCallback(() => {
    setStairStepCount(200);
    const isNew = capturePolaroidAndSave('scene09_stairs_landing');
    useProgressStore.getState().saveCheckpoint();
    if (isNew) {
      ambientAudio.playShutterClick();
      setBaalKuwariToastKind('stairs');
      if (baalKuwariToastTimerRef.current !== null) {
        clearStoryTimeout(baalKuwariToastTimerRef.current);
      }
      baalKuwariToastTimerRef.current = setStoryTimeout(() => {
        baalKuwariToastTimerRef.current = null;
        setBaalKuwariToastKind(null);
      }, 3400);
    }
  }, [capturePolaroidAndSave, setStairStepCount]);

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
    setChaptersInitialPolaroid(null);
    clearAllMovementInputs();
    setScooterReturnOpen(false);
    setUserPaused(false);
    setChaptersInitialTab('chapters');
    setChaptersOpen(true);
  }, [clearAllMovementInputs, setUserPaused]);

  const handleOpenMemoriesTab = useCallback(() => {
    setChaptersInitialPolaroid(null);
    clearAllMovementInputs();
    setScooterReturnOpen(false);
    setUserPaused(false);
    setChaptersInitialTab('memories');
    setChaptersOpen(true);
  }, [clearAllMovementInputs, setUserPaused]);

  const handleInspectMemory = useCallback((id: string) => {
    handleOpenMemoriesTab();
    setChaptersInitialPolaroid(id);
  }, [handleOpenMemoriesTab]);

  const handleProceedToBhaiDooj = useCallback(() => {
    clearInputsRef.current();
    setHotelSummaryOpen(false);
    setBhaiDoojPhase('kitaabi_callback');
    setBhaiDoojTilakApplied(false);
    sceneController.requestSceneTransition(13, { clearInputs: clearInputsRef.current });
  }, [sceneController]);

  const handleFinishBhaiDooj = useCallback(() => {
    clearInputsRef.current();
    sceneController.requestSceneTransition(14, { clearInputs: clearInputsRef.current });
  }, [sceneController]);

  const handleReplayJourney = useCallback(() => {
    clearInputsRef.current();
    setKitaabiStep(0);
    setDay1Phase('travel_cinematic');
    setMorningBreakfastActive(false);
    setMorningBreakfastDone(false);
    setBhaiDoojPhase('kitaabi_callback');
    setBhaiDoojTilakApplied(false);
    sceneController.requestSceneTransition(1, { clearInputs: clearInputsRef.current });
  }, [sceneController]);

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
          } else if (sub === 'viewpoint_walk') {
            sceneController.requestSceneTransition(5, { clearInputs: clearAllMovementInputs });
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

      if (chapter.targetSceneId === 8) {
        const bkSub = chapter.targetBaalSubStage ?? 'driving';
        const targetSeg =
          chapter.targetSegment ??
          (bkSub === 'driving_to_stairs' ? 'to_baalkuwari_stairs' : 'to_baalkuwari');
        setMountainRoadSegment(targetSeg);
        setRoadResumeDistance(LEAD_START_DISTANCE);
        setTrailheadEatingActive(false);
        setAteTrailheadMaggi(false);

        if (committedSceneId === 8) {
          if (bkSub !== baalKuwariSubStage) {
            sceneController.requestBaalKuwariSubStageTransition(bkSub, {
              resumeDistance: LEAD_START_DISTANCE,
              clearInputs: clearAllMovementInputs,
            });
          } else if (bkSub === 'maggi_stop') {
            sceneController.requestSceneTransition(8, { clearInputs: clearAllMovementInputs });
          } else {
            setResetNonce((prev) => prev + 1);
            setArrived(false);
          }
          return;
        }
        setBaalKuwariSubStage(bkSub);
      }

      if (chapter.targetSceneId === 9) {
        setBaalKuwariStairDirection('ascent');
        setStairStepCount(0);
      }

      if (chapter.targetSceneId === 11) {
        setMountainRoadSegment('to_hotel_return');
        setRoadResumeDistance(LEAD_START_DISTANCE);
      }

      if (chapter.targetSceneId === 12) {
        setHotelFarewellDone(false);
        setHotelSummaryOpen(false);
      }

      sceneController.requestSceneTransition(chapter.targetSceneId, {
        clearInputs: clearAllMovementInputs,
      });
    },
    [
      baalKuwariSubStage,
      clearAllMovementInputs,
      committedSceneId,
      mountainRoadSegment,
      roadSubStage,
      sceneController,
      setBaalKuwariStairDirection,
      setBaalKuwariSubStage,
      setMountainRoadSegment,
      setRoadResumeDistance,
      setRoadSubStage,
      setStairStepCount,
      setUserPaused,
    ]
  );

  const handleRestartCurrentStretch = useCallback(() => {
    setUserPaused(false);
    const activeKey = getActiveChapterKey(
      committedSceneId,
      mountainRoadSegment,
      roadSubStage,
      baalKuwariSubStage
    );
    const chapter = PHASE2_STORY_CHAPTERS.find((c) => c.key === activeKey);
    if (chapter) {
      handleSelectChapter(chapter);
    } else {
      handleResetRide();
    }
  }, [
    baalKuwariSubStage,
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
      clearStoryTimeout(trafficWarnTimerRef.current);
    }
    trafficWarnTimerRef.current = setStoryTimeout(() => {
      trafficWarnTimerRef.current = null;
      setTrafficWarningVisible(false);
    }, 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (trafficWarnTimerRef.current !== null) {
        clearStoryTimeout(trafficWarnTimerRef.current);
      }
      if (toastTimerRef.current !== null) clearStoryTimeout(toastTimerRef.current);
      if (viewpointPoseTimerRef.current !== null) clearStoryTimeout(viewpointPoseTimerRef.current);
      if (viewpointFinishTimerRef.current !== null) {
        clearStoryTimeout(viewpointFinishTimerRef.current);
      }
      if (viewpointToastTimerRef.current !== null) {
        clearStoryTimeout(viewpointToastTimerRef.current);
      }
      if (neelkanthDarshanTimerRef.current !== null) {
        clearStoryTimeout(neelkanthDarshanTimerRef.current);
      }
      if (morningToastTimerRef.current !== null) {
        clearStoryTimeout(morningToastTimerRef.current);
      }
      if (neelkanthToastTimerRef.current !== null) {
        clearStoryTimeout(neelkanthToastTimerRef.current);
      }
      if (baalKuwariToastTimerRef.current !== null) {
        clearStoryTimeout(baalKuwariToastTimerRef.current);
      }
      if (bookPhotoPoseTimerRef.current !== null) {
        clearStoryTimeout(bookPhotoPoseTimerRef.current);
      }
      if (bookPhotoFinishTimerRef.current !== null) {
        clearStoryTimeout(bookPhotoFinishTimerRef.current);
      }
      if (hotelSummaryTimerRef.current !== null) {
        clearStoryTimeout(hotelSummaryTimerRef.current);
      }
      if (captionTimerRef.current !== null) {
        clearStoryTimeout(captionTimerRef.current);
      }
    };
  }, []);

  // Sync multi-channel music, custom finale track, & ambient sound levels cleanly
  useEffect(() => {
    const mode =
      transitionPhase !== 'idle' || escalatedToFallback
        ? 'off'
        : isKitaabiSceneActive
          ? 'kitaabi'
          : (isDay1SceneActive && day1Phase === 'travel_cinematic') || isDepartureSceneActive
            ? 'travel'
            : isDrivingSceneActive
              ? 'road'
              : isViewpointWalkActive || (isDay1SceneActive && day1Phase === 'stay_explore')
                ? 'viewpoint'
                : isDhabaWalkActive || isBaalKuwariMaggiActive || isDay2MorningActive
                  ? 'dhaba'
                  : isNeelkanthWalkActive
                    ? 'neelkanth'
                    : isBaalKuwariStairsActive
                      ? 'baalkuwari_stairs'
                      : isBaalKuwariTempleActive
                        ? 'baalkuwari_temple'
                        : isHotelReturnWalkActive || isDay1SceneActive
                          ? 'hotel_evening'
                          : isBhaiDoojSceneActive || isEndingGalleryActive
                            ? 'bhai_dooj'
                            : 'off';

    ambientAudio.syncState({
      muted: audioMuted,
      paused: isSimulationPaused,
      mode,
      musicVolume,
      sfxVolume,
    });
  }, [
    audioMuted,
    day1Phase,
    escalatedToFallback,
    isBaalKuwariMaggiActive,
    isBaalKuwariStairsActive,
    isBaalKuwariTempleActive,
    isBhaiDoojSceneActive,
    isDay1SceneActive,
    isDay2MorningActive,
    isDepartureSceneActive,
    isDhabaWalkActive,
    isDrivingSceneActive,
    isEndingGalleryActive,
    isHotelReturnWalkActive,
    isKitaabiSceneActive,
    isNeelkanthWalkActive,
    isSimulationPaused,
    isViewpointWalkActive,
    musicVolume,
    sfxVolume,
    transitionPhase,
  ]);

  useEffect(() => {
    ambientAudio.setFinaleTrackUrl(finaleSongUrl);
  }, [finaleSongUrl]);

  useEffect(() => {
    const phaseForMusic = isBhaiDoojSceneActive
      ? bhaiDoojPhase
      : isEndingGalleryActive
        ? 'ending'
        : 'inactive';
    ambientAudio.syncFinaleMusicPhase(phaseForMusic);
  }, [bhaiDoojPhase, isBhaiDoojSceneActive, isEndingGalleryActive]);

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

  // Cancel outgoing work and reset transient state on switches and explicit restarts.
  useEffect(() => {
    clearStoryTimers();
    setArrived(false);
    setInViewpointZone(false);
    setViewpointArrived(false);
    setTrafficWarningVisible(false);
    setNearbyHotspot(null);
    setPolaroidToastVisible(false);
    setMorningToastVisible(false);
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
    setTrailheadEatingActive(false);
    setBaalKuwariToastKind(null);
    setBookPhotoActive(false);
    setSummitArrivalCinematicActive(committedSceneId === 10);
    setHotelFarewellDone(false);
    setHotelSummaryOpen(false);
    if (committedSceneId === 1) {
      setKitaabiStep(0);
    } else if (committedSceneId === 2) {
      setDay1Phase('travel_cinematic');
    } else if (committedSceneId === 3) {
      setMorningBreakfastActive(false);
      setMorningBreakfastDone(false);
    } else if (committedSceneId === 13) {
      setBhaiDoojPhase('kitaabi_callback');
      setBhaiDoojTilakApplied(false);
      ambientAudio.playBhaiDoojChime();
    } else if (committedSceneId === 14) {
      ambientAudio.playBhaiDoojChime();
    }
    if (captionTimerRef.current !== null) {
      clearStoryTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    setActiveCaption(null);
    if (committedSceneId === 8 && baalKuwariSubStage === 'maggi_stop') {
      setAteTrailheadMaggi(false);
    }
  }, [baalKuwariSubStage, committedSceneId, roadSubStage, sceneMountToken, clearStoryTimers]);

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
        (event.code === 'KeyE' || event.code === 'Enter') &&
        isBhaiDoojSceneActive &&
        !userPaused &&
        !anyModalOpen &&
        useProgressStore.getState().transitionPhase === 'idle'
      ) {
        if (bhaiDoojPhase === 'arrival') {
          event.preventDefault();
          setBhaiDoojPhase('applying_tilak');
          return;
        }
        if (bhaiDoojPhase === 'sweet_offer') {
          event.preventDefault();
          setBhaiDoojPhase('eating_together');
          return;
        }
      }

      if (
        event.code === 'Space' &&
        (foodCinematicActive ||
          trailheadEatingActive ||
          summitArrivalCinematicActive ||
          isBaalKuwariStairsActive ||
          isDepartureSceneActive ||
          (isBhaiDoojSceneActive && bhaiDoojPhase === 'eating_together') ||
          (isDay2MorningActive && morningBreakfastActive) ||
          (isDay1SceneActive && day1Phase !== 'stay_explore')) &&
        !userPaused &&
        !anyModalOpen &&
        useProgressStore.getState().transitionPhase === 'idle'
      ) {
        event.preventDefault();
        if (isBhaiDoojSceneActive && bhaiDoojPhase === 'eating_together') {
          setBhaiDoojPhase('creator_letter');
        } else if (isDepartureSceneActive) {
          handleScooterDepartureComplete();
        } else if (isDay2MorningActive && morningBreakfastActive) {
          handleMorningBreakfastComplete();
        } else if (isDay1SceneActive && day1Phase === 'travel_cinematic') {
          setDay1Phase('stay_explore');
        } else if (isDay1SceneActive && day1Phase === 'evening_maggi') {
          handleDay1Complete();
        } else if (trailheadEatingActive) {
          handleTrailheadMaggiComplete();
        } else if (isBaalKuwariStairsActive) {
          if (baalKuwariStairDirection === 'descent') {
            handleStairDescentComplete();
          } else {
            handleStairAscentComplete();
          }
        } else if (summitArrivalCinematicActive) {
          handleSummitArrivalCinematicComplete();
        } else {
          handleFoodCinematicComplete();
        }
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
    baalKuwariStairDirection,
    bhaiDoojPhase,
    chaptersOpen,
    clearAllMovementInputs,
    controlsOpen,
    day1Phase,
    foodCinematicActive,
    handleDay1Complete,
    handleDismissControls,
    handleFoodCinematicComplete,
    handleMorningBreakfastComplete,
    handleScooterDepartureComplete,
    handleStairAscentComplete,
    handleStairDescentComplete,
    handleSummitArrivalCinematicComplete,
    handleTrailheadMaggiComplete,
    isBaalKuwariStairsActive,
    isBhaiDoojSceneActive,
    isDay1SceneActive,
    isDay2MorningActive,
    isDepartureSceneActive,
    morningBreakfastActive,
    scooterReturnOpen,
    setTabHiddenPaused,
    setUserPaused,
    summitArrivalCinematicActive,
    toggleAudio,
    trailheadEatingActive,
    userPaused,
  ]);

  // Freeze held inputs whenever pause/modal activates or a scene transition starts.
  useEffect(() => {
    if (userPaused || anyModalOpen || transitionPhase !== 'idle') {
      clearAllMovementInputs();
    }
  }, [anyModalOpen, clearAllMovementInputs, transitionPhase, userPaused]);

  // Pause automatic cinematics, traffic, and simulation clocks while UI modals/overlays are open.
  useEffect(() => {
    setModalPaused(
      anyModalOpen ||
        hotelSummaryOpen ||
        pendingResumeCheckpoint !== null ||
        activeNarration !== null
    );
    return () => setModalPaused(false);
  }, [
    activeNarration,
    anyModalOpen,
    hotelSummaryOpen,
    pendingResumeCheckpoint,
    setModalPaused,
  ]);

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
      (c) =>
        c.key ===
        getActiveChapterKey(
          committedSceneId,
          mountainRoadSegment,
          roadSubStage,
          baalKuwariSubStage
        )
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
        <AdaptiveQualityMonitor />
        <SceneStage
          controller={sceneController}
          inputRef={inputRef}
          walkInputRef={walkInputRef}
          day1Phase={day1Phase}
          onAdvanceDay1Phase={setDay1Phase}
          onDay1Complete={handleDay1Complete}
          morningBreakfastActive={morningBreakfastActive}
          morningBreakfastDone={morningBreakfastDone}
          onMorningBreakfastComplete={handleMorningBreakfastComplete}
          onScooterDepartureComplete={handleScooterDepartureComplete}
          resetNonce={resetNonce}
          viewpointPullOverNonce={viewpointPullOverNonce}
          telemetryRefs={telemetryRefs}
          ateMaggi={ateMaggi}
          sippedChai={sippedChai}
          capturedDhabaPolaroid={capturedDhabaPolaroid}
          foodCinematicActive={foodCinematicActive}
          onFoodCinematicComplete={handleFoodCinematicComplete}
          capturedViewpointShree={capturedViewpointShree}
          capturedViewpointSolo={capturedViewpointSolo}
          capturedViewpointGroup={capturedViewpointGroup}
          viewpointPhotoMoment={viewpointPhotoMoment}
          rangBell={rangBell}
          bellSwingImpulseNonce={bellSwingImpulseNonce}
          litDiya={litDiya}
          hadDarshan={hadDarshan}
          capturedNeelkanthFood={capturedNeelkanthFood}
          activeDarshanPan={activeDarshanPan}
          ateTrailheadMaggi={ateTrailheadMaggi}
          trailheadEatingActive={trailheadEatingActive}
          onTrailheadMaggiComplete={handleTrailheadMaggiComplete}
          stairTelemetryRefs={stairTelemetryRefs}
          onEnterStaircaseFromFootpath={handleEnterStaircaseFromFootpath}
          onStairHalfwayMilestone={handleStairHalfwayMilestone}
          onStairAscentComplete={handleStairAscentComplete}
          onStairDescentComplete={handleStairDescentComplete}
          summitArrivalCinematicActive={summitArrivalCinematicActive}
          onSummitArrivalCinematicComplete={handleSummitArrivalCinematicComplete}
          rangBaalKuwariBell={rangBaalKuwariBell}
          baalKuwariBellNonce={baalKuwariBellNonce}
          capturedBaalKuwariPolaroid={capturedBaalKuwariPolaroid}
          capturedBookPolaroid={capturedBaalKuwariBook}
          bookPhotoActive={bookPhotoActive}
          hotelFarewellDone={hotelFarewellDone}
          bhaiDoojPhase={bhaiDoojPhase}
          bhaiDoojTilakApplied={bhaiDoojTilakApplied}
          onBhaiDoojTilakApplied={() => setBhaiDoojTilakApplied(true)}
          onBhaiDoojTilakComplete={() => setBhaiDoojPhase('sweet_offer')}
          onBhaiDoojEatingComplete={() => setBhaiDoojPhase('creator_letter')}
          collectedPolaroids={collectedPolaroids}
          onInspectMemory={handleInspectMemory}
          onNearbyHotspotChange={setNearbyHotspot}
          onArrivedChange={setArrived}
          onInViewpointZoneChange={setInViewpointZone}
          onViewpointArrivedChange={setViewpointArrived}
          onTrafficBrush={handleTrafficBrush}
        />
      </Canvas>

      {isKitaabiSceneActive ||
      isDay1SceneActive ||
      isDay2MorningActive ||
      isDepartureSceneActive ? (
        <>
          <PrologueStoryHUD
            mode={
              isKitaabiSceneActive
                ? 'scene01_kitaabi'
                : isDay1SceneActive
                  ? 'scene02_day1'
                  : isDay2MorningActive
                    ? 'scene03_morning'
                    : 'scene04_departure'
            }
            audioMuted={audioMuted}
            onToggleAudioMute={toggleAudio}
            onOpenChapters={handleOpenChapters}
            onPause={handleOpenPause}
            polaroidCount={validPolaroidCount}
            kitaabiStep={kitaabiStep}
            onAdvanceKitaabi={handleAdvanceKitaabi}
            day1Phase={day1Phase}
            onSkipDay1Travel={() => setDay1Phase('stay_explore')}
            onSkipEveningMaggi={handleDay1Complete}
            morningBreakfastActive={morningBreakfastActive}
            morningBreakfastDone={morningBreakfastDone}
            morningToastVisible={morningToastVisible}
            onDismissMorningToast={() => setMorningToastVisible(false)}
            onSkipBreakfast={handleMorningBreakfastComplete}
            onSkipDeparture={handleScooterDepartureComplete}
            touchControlsVisible={touchControlsVisible}
            nearbyHotspot={nearbyHotspot}
            onTriggerHotspot={handleWalkInteract}
          />
          <MobileWalkControls
            visible={
              touchControlsVisible &&
              ((isDay1SceneActive && day1Phase === 'stay_explore') || isDay2MorningActive) &&
              !contextLost &&
              !userPaused &&
              !anyModalOpen &&
              !morningBreakfastActive &&
              transitionPhase === 'idle'
            }
            nearbyHotspot={nearbyHotspot}
            onWalkMoveTouch={setWalkMoveTouch}
            onInteract={handleWalkInteract}
            onPhoto={handleWalkPhoto}
          />
        </>
      ) : isDrivingSceneActive ? (
        <>
          <PrototypeHUD
            arrived={arrived}
            inViewpointZone={inViewpointZone}
            viewpointArrived={viewpointArrived}
            trafficWarningVisible={trafficWarningVisible}
            roadSegment={
              committedSceneId === 8
                ? baalKuwariSubStage === 'driving_to_stairs'
                  ? 'to_baalkuwari_stairs'
                  : 'to_baalkuwari'
                : committedSceneId === 11
                  ? 'to_hotel_return'
                  : mountainRoadSegment
            }
            polaroidCount={validPolaroidCount}
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
            onEnterBaalKuwariMaggi={handleEnterBaalKuwariMaggi}
            onEnterBaalKuwariStairs={handleEnterStaircaseFromFootpath}
            onEnterHotelCourtyard={handleEnterHotelCourtyard}
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
            capturedShree={capturedViewpointShree}
            capturedSolo={capturedViewpointSolo}
            capturedGroup={capturedViewpointGroup}
            polaroidCount={validPolaroidCount}
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
            polaroidCount={validPolaroidCount}
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
            capturedFood={capturedNeelkanthFood}
            polaroidCount={validPolaroidCount}
            polaroidToastVisible={neelkanthToastVisible}
            onDismissPolaroidToast={() => setNeelkanthToastVisible(false)}
            nearbyHotspot={nearbyHotspot}
            hasActiveNarration={activeNarration !== null}
            activeDarshanPan={activeDarshanPan}
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
      ) : isBaalKuwariMaggiActive ||
        isBaalKuwariStairsActive ||
        isBaalKuwariTempleActive ? (
        <>
          <BaalKuwariHUD
            mode={
              isBaalKuwariMaggiActive
                ? 'maggi_stop'
                : isBaalKuwariStairsActive
                  ? baalKuwariStairDirection === 'descent'
                    ? 'descent'
                    : 'stairs'
                  : 'temple'
            }
            audioMuted={audioMuted}
            onToggleAudioMute={toggleAudio}
            touchControlsVisible={touchControlsVisible}
            onOpenChapters={handleOpenChapters}
            onPause={handleOpenPause}
            polaroidCount={validPolaroidCount}
            nearbyHotspot={nearbyHotspot}
            hasActiveNarration={activeNarration !== null}
            ateMaggi={ateTrailheadMaggi}
            eatingActive={trailheadEatingActive}
            onBeginClimbFromMaggi={handleBeginClimbFromMaggi}
            totalSteps={400}
            stairTelemetryRefs={stairTelemetryRefs}
            onSkipStairCinematic={
              baalKuwariStairDirection === 'descent'
                ? handleStairDescentComplete
                : handleStairAscentComplete
            }
            arrivalCinematicActive={summitArrivalCinematicActive}
            onSkipArrivalCinematic={handleSummitArrivalCinematicComplete}
            rangBell={rangBaalKuwariBell}
            capturedPolaroid={capturedBaalKuwariPolaroid}
            capturedBookPolaroid={capturedBaalKuwariBook}
            bookPhotoActive={bookPhotoActive}
            polaroidToastVisible={baalKuwariToastKind !== null}
            polaroidId={
              baalKuwariToastKind === 'stairs'
                ? 'scene09_stairs_landing'
                : baalKuwariToastKind === 'book'
                  ? 'scene10_baalkuwari_book'
                  : 'scene10_baalkuwari'
            }
            toastTitle={
              baalKuwariToastKind === 'stairs'
                ? 'Mid-Climb Valley View'
                : baalKuwariToastKind === 'book'
                  ? 'With Her Book — Baal Kuwari'
                  : 'Baal Kuwari Temple'
            }
            toastCaption={
              baalKuwariToastKind === 'stairs'
                ? '~200 Steps Rest · Valley Overlook'
                : baalKuwariToastKind === 'book'
                  ? 'Quiet reading overlook facing the peaks'
                  : 'Baal Kuwari Summit · After ~400 Steps'
            }
            onDismissPolaroidToast={() => setBaalKuwariToastKind(null)}
            onTriggerHotspot={handleWalkInteract}
          />
          <MobileWalkControls
            visible={
              touchControlsVisible &&
              !isBaalKuwariStairsActive &&
              !contextLost &&
              !userPaused &&
              !anyModalOpen &&
              !trailheadEatingActive &&
              !summitArrivalCinematicActive &&
              !bookPhotoActive &&
              transitionPhase === 'idle'
            }
            nearbyHotspot={nearbyHotspot}
            onWalkMoveTouch={setWalkMoveTouch}
            onInteract={handleWalkInteract}
            onPhoto={handleWalkPhoto}
          />
        </>
      ) : isHotelReturnWalkActive ? (
        <>
          <HotelReturnHUD
            audioMuted={audioMuted}
            onToggleAudioMute={toggleAudio}
            touchControlsVisible={touchControlsVisible}
            onOpenChapters={handleOpenChapters}
            onPause={handleOpenPause}
            farewellDone={hotelFarewellDone}
            tripSummaryOpen={hotelSummaryOpen}
            onDismissTripSummary={() => setHotelSummaryOpen(false)}
            onProceedToBhaiDooj={handleProceedToBhaiDooj}
            polaroidCount={validPolaroidCount}
            nearbyHotspot={nearbyHotspot}
            hasActiveNarration={activeNarration !== null}
            onTriggerHotspot={handleWalkInteract}
          />
          <MobileWalkControls
            visible={
              touchControlsVisible &&
              !contextLost &&
              !userPaused &&
              !anyModalOpen &&
              !hotelSummaryOpen &&
              transitionPhase === 'idle'
            }
            nearbyHotspot={nearbyHotspot}
            onWalkMoveTouch={setWalkMoveTouch}
            onInteract={handleWalkInteract}
            onPhoto={handleWalkPhoto}
          />
        </>
      ) : isBhaiDoojSceneActive ? (
        <BhaiDoojHUD
          phase={bhaiDoojPhase}
          tilakApplied={bhaiDoojTilakApplied}
          audioMuted={audioMuted}
          onToggleAudioMute={toggleAudio}
          onOpenChapters={handleOpenChapters}
          onPause={handleOpenPause}
          polaroidCount={validPolaroidCount}
          onStartCelebration={() => setBhaiDoojPhase('arrival')}
          onTriggerTilak={() => setBhaiDoojPhase('applying_tilak')}
          onAcceptSweets={() => setBhaiDoojPhase('eating_together')}
          onSkipEating={() => setBhaiDoojPhase('creator_letter')}
          onFinishFinale={handleFinishBhaiDooj}
        />
      ) : isEndingGalleryActive ? (
        <EndingScreenHUD
          audioMuted={audioMuted}
          onToggleAudioMute={toggleAudio}
          onOpenChapters={handleOpenChapters}
          onPause={handleOpenPause}
          polaroidCount={validPolaroidCount}
          onReplayJourney={handleReplayJourney}
          onViewMemories={handleOpenMemoriesTab}
          onCelebrateAgain={handleProceedToBhaiDooj}
        />
      ) : null}

      {activeCaption && activeNarration === null && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-20"
        >
          <div className="max-w-lg rounded-2xl border border-amber-300/45 bg-slate-950/85 px-4 py-2 text-center shadow-xl backdrop-blur-md">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-amber-300 uppercase">
              {activeCaption.speaker}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-100">
              {activeCaption.text}
            </p>
          </div>
        </div>
      )}

      <NarrationCard touchControlsVisible={touchControlsVisible} />

      <PauseMenuModal
        open={userPaused && transitionPhase === 'idle' && !contextLost}
        chapterTitle={currentChapterTitle}
        qualityProfile={qualityProfile}
        audioMuted={audioMuted}
        musicVolume={musicVolume}
        sfxVolume={sfxVolume}
        touchControlsVisible={touchControlsVisible}
        canShowDevToggle={isDevEnvironment}
        devToolsVisible={devToolsVisible}
        onToggleDevTools={() => setDevToolsVisible((v) => !v)}
        onChangeQuality={setQualityProfile}
        onToggleAudioMute={toggleAudio}
        onChangeMusicVolume={setMusicVolume}
        onChangeSfxVolume={setSfxVolume}
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
        initialTab={chaptersInitialTab}
        initialPolaroidId={chaptersInitialPolaroid}
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
        onRideToBaalKuwari={() => {
          setScooterReturnOpen(false);
          handleRideToBaalKuwari();
        }}
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
