import { useEffect, useMemo, useRef } from 'react';
import {
  ActionIcon,
  Group,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
} from '@tabler/icons-react';
import {
  usePlaybackState,
  usePlaybackActions,
  useSimulationState,
  useSimulationRanges,
} from '../../shared/state/editorStore';
import { formatSeconds, secondsFromIndex } from '../../shared/utils/time';

const SPEED_OPTIONS = [
  { label: '0.25×', value: '0.25' },
  { label: '0.5×', value: '0.5' },
  { label: '1×', value: '1' },
  { label: '2×', value: '2' },
  { label: '4×', value: '4' },
];

const MIN_INTERVAL_MS = 100;

export function SimulationTimeline() {
  const {
    currentIndex,
    totalTimesteps,
    isPlaying,
    playbackSpeed,
  } = usePlaybackState();
  
  const {
    setCurrentTimestep,
    nextTimestep,
    previousTimestep,
    togglePlayback,
    setPlaybackSpeed,
  } = usePlaybackActions();
  
  const simulation = useSimulationState();
  const ranges = useSimulationRanges();

  const reportStepSeconds = simulation.results?.reportStep ?? 0;
  const hasTimesteps = totalTimesteps > 0;
  const isSliderDisabled = totalTimesteps <= 1;

  const playbackRef = useRef<number | null>(null);
  const tickReference = useRef<number | null>(null);

  const stepDurationMs = useMemo(() => {
    if (!reportStepSeconds || reportStepSeconds <= 0 || playbackSpeed <= 0) {
      return MIN_INTERVAL_MS;
    }
    const ms = (reportStepSeconds * 1000) / playbackSpeed;
    return Math.max(MIN_INTERVAL_MS, ms);
  }, [reportStepSeconds, playbackSpeed]);

  useEffect(() => {
    if (!isPlaying || isSliderDisabled) {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
        playbackRef.current = null;
      }
      tickReference.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (!tickReference.current) {
        tickReference.current = timestamp;
      }

      const elapsed = timestamp - tickReference.current;
      if (elapsed >= stepDurationMs) {
        tickReference.current = timestamp;
        nextTimestep();
      }

      playbackRef.current = requestAnimationFrame(tick);
    };

    playbackRef.current = requestAnimationFrame(tick);

    return () => {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
        playbackRef.current = null;
      }
      tickReference.current = null;
    };
  }, [isPlaying, isSliderDisabled, stepDurationMs, nextTimestep]);

  useEffect(() => {
    if (!isPlaying) {
      tickReference.current = null;
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && hasTimesteps && currentIndex >= totalTimesteps - 1) {
      togglePlayback();
    }
  }, [currentIndex, totalTimesteps, isPlaying, hasTimesteps, togglePlayback]);

  const formattedCurrentTime = formatSeconds(
    secondsFromIndex(currentIndex, reportStepSeconds),
  );
  const formattedDuration = formatSeconds(simulation.results?.duration);

  const handleSliderChange = (value: number) => {
    setCurrentTimestep(Math.round(value));
    if (isPlaying) {
      tickReference.current = null;
    }
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Group gap="xs">
          <Tooltip label="Timestep anterior">
            <ActionIcon
              variant="subtle"
              radius="xl"
              size="md"
              onClick={previousTimestep}
              disabled={!hasTimesteps || currentIndex === 0}
            >
              <IconPlayerTrackPrev size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={isPlaying ? 'Pausar' : 'Reproducir'}>
            <ActionIcon
              color="blue"
              radius="xl"
              size="md"
              variant="filled"
              onClick={togglePlayback}
              disabled={isSliderDisabled}
            >
              {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Siguiente timestep">
            <ActionIcon
              variant="subtle"
              radius="xl"
              size="md"
              onClick={nextTimestep}
              disabled={!hasTimesteps || currentIndex >= totalTimesteps - 1}
            >
              <IconPlayerTrackNext size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <SegmentedControl
          value={playbackSpeed.toString()}
          onChange={(value) => setPlaybackSpeed(Number(value))}
          data={SPEED_OPTIONS}
          size="xs"
        />
      </Group>

      <Stack gap={4}>
        <Slider
          min={0}
          max={Math.max(totalTimesteps - 1, 0)}
          step={1}
          value={currentIndex}
          onChange={handleSliderChange}
          disabled={isSliderDisabled}
          marks={
            hasTimesteps
              ? [
                  { value: 0, label: 'Inicio' },
                  { value: Math.max(totalTimesteps - 1, 0), label: 'Final' },
                ]
              : undefined
          }
        />
        <Group justify="space-between" gap="xs">
          <Text size="xs" c="dimmed">
            Paso {hasTimesteps ? currentIndex + 1 : 0} de {totalTimesteps}
          </Text>
          <Text size="xs" c="dimmed">
            {formattedCurrentTime} / {formattedDuration}
          </Text>
        </Group>
      </Stack>

      {ranges && (
        <Text size="xs" c="dimmed">
          Presión: {ranges.pressure.min.toFixed(2)} → {ranges.pressure.max.toFixed(2)} | Caudal:{' '}
          {ranges.flow.min.toFixed(3)} → {ranges.flow.max.toFixed(3)}
        </Text>
      )}
    </Stack>
  );
}
