**To remove steady background noise in Audacity, select a short noise-only section, open Effect → Noise removal and repair → Noise reduction, and choose Get noise profile. Then select the voice audio you want to clean and apply a modest reduction.** Check what the effect removes before processing the whole recording: reducing hiss is useful, but losing words is not.

This guide focuses on spoken recordings: a podcast interview, tutorial narration, voice memo or recorded presentation. It explains the settings, the noise-profile step, a repeatable comparison exercise and how to export without accidentally shortening a video's soundtrack. For the broader recording-to-distribution process, see our [podcast production workflow](/blog/best-ai-tools-for-podcasters-2026).

**Version and research note:** the official download page lists Audacity **4.0.0** as of October 1, 2026. The instructions below follow its current manual, with older Audacity 3 labels identified separately. This is a documentation-based guide, not a hands-on audio-quality benchmark. The practice exercise is original and illustrative; no amount of processing guarantees an unchanged voice or completely silent background.

## Quick Start: Clean a Short Sample First

Keep an untouched original, then try this on a short section rather than your only copy of a long recording:

1. Import the recording and save a local editing project.
2. Select a few seconds containing the unwanted steady noise but no voice, music or movement you want to keep.
3. Open **Effect → Noise removal and repair → Noise reduction → Get noise profile**.
4. Select a short voice passage containing both speech and a pause. Reopen Noise reduction.
5. Try the documented Audacity 4 defaults: **6 dB reduction, sensitivity 6, frequency smoothing 6 bands**. These are starting values, not “best settings.”
6. Select **Noise only**, apply, and listen to what would be removed. **Undo this diagnostic result.** If recognizable speech is present, revise the profile or use gentler settings.
7. Reopen the effect, choose **Audio with noise removed**, apply to the restored sample, and compare it with the original.

Only extend the treatment to the intended recording after the sample sounds acceptable. The [current Noise Reduction manual](https://www.audacityteam.org/manual/effects/noise-removal-and-repair/noise-reduction) is the reference for those labels and defaults.

## Check Whether Noise Reduction Fits the Problem

Audacity's built-in effect learns the frequency pattern of a sample you identify as noise. It is most suitable when that pattern stays reasonably consistent, such as hiss or a computer fan. It does not understand your intentions merely because one sound is louder or one speaker is nearer the microphone.

| What you hear | A sensible first approach | Important limitation |
| --- | --- | --- |
| Steady hiss or fan noise | Profile-based Noise Reduction | Aggressive filtering can remove parts of the voice |
| A narrow electrical hum or whistle | Identify the frequency; consider a Notch Filter | A broad cut can affect wanted sound too |
| Noise mainly between phrases | Gentle gating or careful gap editing | A gate does not remove noise underneath speech |
| One click, bump or door slam | Inspect and repair that event separately | A steady-noise profile is not a general event remover |
| Room echo or changing background conversation | Improve the recording or assess a suitable speech-enhancement tool | Do not expect profile-based reduction to cleanly separate it |
| Harsh, flattened peaks | Inspect clipping; re-record if necessary | Noise Reduction is not clipping repair |

Listen before choosing a tool. If the voice already sounds distant and indistinct, a quieter background may still leave a distant, indistinct voice. The target is understandable speech with tolerable noise, not a visually flat waveform between every sentence.

## Step 1: Preserve the Original and Import the Voice

Download from the [official Audacity website](https://www.audacityteam.org/download/), not an advertisement offering an unrelated “Audacity online” editor. The desktop app is available for Windows, macOS and Linux. You do not need a paid noise-removal plugin for the built-in workflow in this article.

Keep the source recording unchanged in a separate location. Import a working copy by dragging the audio into Audacity or using its audio-import command. If a phone recording will not import, check its format before assuming the file is broken. Audacity's [basic editing guide](https://www.audacityteam.org/manual/getting-started/basic-audio-editing) notes that some formats, including M4A, may require FFmpeg. Use the installation instructions linked from the official manual rather than a random codec download.

Save the editing project using **Save to computer**. Audacity 4 uses an editable **.aup4** project; it can also open older **.aup3** projects. A project is different from a WAV or MP3 deliverable. Keep the original recording even after saving: a separate source file is a clearer recovery point than relying entirely on an undo history.

For a multitrack interview, work on the noisy voice track rather than the combined voice-and-music mix. Different microphones can have different background noise. **Ctrl+A selects the entire project** in the current guide, so check both the track and the selected time range instead of blindly following a “select all” tutorial.

Use only recordings you are permitted to process. A meeting participant's consent to attend is not automatically permission to upload the recording to another service. Our [meeting-assistant guide](/blog/best-ai-meeting-assistants-2026) covers that wider recording-and-review workflow; this local cleanup does not require sending the audio to a transcription or AI provider.

![Colored audio waveforms arranged across several tracks in an editor](https://images.pexels.com/photos/4765390/pexels-photo-4765390.jpeg?auto=compress&cs=tinysrgb&w=1400 "Choose the intended voice track and time range before applying an effect; this is an illustrative editing screen, not Audacity 4")

## Step 2: Capture a Representative Noise Profile

Find a pause where the microphone was still recording the same background as the speech. Listen to that selection by itself. It should contain the hiss or fan you want reduced, not a breath, keyboard tap, chair movement, music or the quiet end of a word.

Select a few seconds if available, then choose **Get noise profile** in the Noise reduction dialog. This tells the effect what to treat as unwanted sound; it does not yet clean the recording. Next, select the voice passage to process and reopen the effect. Leaving only the original noise sample selected would treat the wrong section.

Do not profile a patch of digital silence created by muting or deleting audio: it does not contain the recorded noise pattern. Likewise, a noise recording made later with different gain, microphone position or room conditions may be a poor match. Use a representative section from the actual take wherever possible.

If there is speech everywhere, inspect pauses between phrases before forcing a profile. Do not label a whole sentence as “noise” just to enable the next step. For a new take, record a short period of room sound before speaking. For an existing take without a usable sample, another restoration method or a new recording may be more sensible.

When a fan changes speed halfway through a recording, one profile may not suit both parts. Consider treating the sections separately with their own profiles, then listen across the boundary for abrupt changes. That is a judgment call based on what you hear, not a rule to split every recording into tiny pieces.

## Step 3: Understand the Settings Before Raising Them

The current Audacity 4 manual specifies **6/6/6** as the defaults. You may see **12/6/3** in other recipes, including a starting example on Audacity's [feature page](https://www.audacityteam.org/features/noise-reduction/). An example recipe and a version's default values are not the same thing. Neither proves the ideal treatment for your microphone or room.

| Control | Audacity 4 default | What you are adjusting |
| --- | --- | --- |
| Noise reduction | 6 dB | How strongly sound classified as noise is attenuated |
| Sensitivity | 6 | How readily a sound is classified as noise rather than wanted signal |
| Frequency smoothing | 6 bands | How the reduction is spread across neighboring frequency bands |

**Noise reduction is the amount, not a voice-quality score.** More reduction can quiet the background but produce metallic, watery or fluttering artifacts. If the result is unpleasant, back off rather than assuming another stronger pass will repair it. Some remaining hiss can be less distracting than a damaged voice.

**Sensitivity changes what gets removed.** Raising it can catch more unwanted sound, but it can also classify quiet speech components as noise. Pay special attention to soft consonants, breathy words and fading sentence endings. If those sounds appear clearly in the Noise only output, the profile or settings need attention.

**Frequency smoothing is a tradeoff, not a precision slider.** It spreads processing across neighboring bands. It can reduce isolated musical artifacts, but too much spreading can affect clarity. Keep it fixed while testing a change to reduction or sensitivity; otherwise you will not know which adjustment caused the difference.

For the first comparison, the documented defaults provide a reproducible reference. If speech is damaged, try less reduction or lower sensitivity on a fresh untreated sample. Change one control at a time and listen again. There is no universal “maximum safe dB” value that works for every voice.

## Step 4: Check Noise Only, Then Undo It

In Audacity 4, **Noise only** lets you hear the material the effect would remove. The current manual describes applying that output, listening, and undoing it. It is a diagnostic result, not the cleaned recording you should export.

Listen for recognizable speech, not merely for any sound. Hearing the fan or hiss is expected. Hearing intelligible words, clear consonants or substantial voice tone means wanted content is being removed as well. Recheck whether the profile included speech, then test gentler settings. Do not simply accept the result because the remaining voice is louder than the removed voice.

**Undo the Noise only application before continuing.** Restore the original sample, reopen Noise reduction, and explicitly switch Output to **Audio with noise removed**. If you accidentally process the diagnostic output itself, you are cleaning the discarded material rather than your recording. If unsure which state you are in, start again from the untouched source.

### Audacity 3: Reduce Versus Residue

Older tutorials and the [legacy manual](https://manual.audacityteam.org/man/noise_reduction.html) call the normal output **Reduce** and the removed material **Residue**. The principle is the same, but the labels and preview workflow differ. In a 3.x dialog with Preview, you can preview Residue, then switch back to Reduce before applying the actual cleanup. Do not search for a “Residue” button in a 4.0 dialog that calls it Noise only.

![Headphones beside a laptop displaying an older audio-editing interface](https://images.pexels.com/photos/3846434/pexels-photo-3846434.jpeg?auto=compress&cs=tinysrgb&w=1400 "Compare the wanted voice and the removed material through headphones; the pictured interface is not a guide to current button locations")

## A Repeatable Voice Test Instead of Guessing

Here is an original practice exercise you can perform on your own recording. It is not a report of measured Audacity results. Record a few seconds of ordinary room sound, then speak this sample naturally, leaving a short pause between sentences:

> Seven small switches sit beside the screen. Please save the first version before making changes. The final word should remain clear, even when I speak more quietly.

Use a normal speaking volume and comfortable playback level. Do not deliberately add loud noise or overload the microphone. The sample includes soft consonants and a quieter ending so you have something specific to inspect beyond the silent gaps.

Keep three clearly named comparison files: an untreated reference, a first cleaned attempt, and one revised attempt. Each processed attempt must start from the same untreated audio, not from the previous processed file. Export the same passage and compare one file at a time, at roughly matched voice loudness, without added music, compression or normalization changing the comparison.

Write down the profile location, settings and one observation. For example, “fan less distracting, but the last word sounds thin” is useful; “sounds professional” is not a diagnosis. Decide whether the next test should use a cleaner profile, less reduction or lower sensitivity. If neither processed attempt improves intelligibility, keep the original and address the recording conditions instead.

## Step 5: Apply the Chosen Treatment Without Losing Sync

Once the sample is acceptable, return to the unprocessed version and select the intended full voice passage. Confirm that the output is **Audio with noise removed**, then apply the chosen settings. Inspect quiet and loud sections, not just the opening sentence. A guest who moves away from the microphone can become more vulnerable to the same settings later in the recording.

Do not automatically stack repeated denoising passes. If the first result is wrong, undo it or return to the original and revise the treatment. Compression, normalization and final loudness changes are separate tasks; do them after assessing cleanup, then listen again because raising quiet material can make residual noise more noticeable.

For audio returning to a video editor, preserve its start position, duration and intended pauses. Audacity's **Silence** operation keeps the selected time, while a ripple delete closes a gap and moves later audio. Do not remove the room-tone sample from the working soundtrack merely because you have used it for the profile. Keep a separate editing copy if you want to shorten the finished piece.

Bring the cleaned audio back at the same timeline position and check synchronization near both the beginning and end. Silence or denoising alone is not a reason to change playback speed. Our [AI video-editing walkthrough](/blog/how-to-edit-videos-with-ai-2026) covers the surrounding timeline and captioning tasks.

Before sending the recording to a transcription service, check that cleanup has not removed quiet words or changed what you can understand. Our [AI transcription tools guide](/blog/best-ai-transcription-tools-2026) covers service choices, but denoising does not guarantee an accurate transcript. Proofread names, numbers and qualifications against the recording.

## Step 6: Export an Audio File, Not Just a Project

Use **File → Export audio** when you need a file to share or place in another editor. The [current export guide](https://www.audacityteam.org/manual/getting-started/export-your-audio) distinguishes **Export full project audio**, **Export selected audio**, and **Export audio in loop region**. A short file at export may simply mean the test selection or loop region is still chosen.

Check which tracks are included. If you kept original and processed versions on separate tracks, do not mix both into the deliverable. For a simple voice-only workflow, a separate project containing only the chosen voice version avoids that mistake. Open the exported file in another player and check its duration, beginning, ending and channel balance.

A WAV is useful when another editor will process the audio again; an MP3 can be convenient for a smaller delivery file. Follow your destination's format and loudness requirements first. Audacity offers 128 kbps as general MP3 starting guidance for speech, not a universal mastering specification. Do not change sample rate or channel count just because a tutorial uses different values.

Add background music only after judging the voice on its own, and check that the mix does not mask words. If you are considering a generated soundtrack, our [AI music guide](/blog/how-to-make-ai-music-2026) separates creating a track from obtaining download and usage permission. Music is not a repair for unintelligible speech.

## Fix the Problems That a Noise Profile Cannot Solve

**A muffled or underwater voice:** start again from the original, check that the profile contains no wanted audio, and lower the treatment. Do not try to restore missing consonants with a large treble boost. That can make surviving hiss louder without recovering the information removed.

**Electrical hum:** Audacity's [Notch Filter](https://www.audacityteam.org/manual/effects/eq-and-filters/notch-filter) targets a narrow frequency, such as an identified 50 or 60 Hz mains hum. Harmonics may also be present. Determine what you hear before adding several cuts; a notch is not an instruction to remove every low frequency from a voice.

**Noise between words:** a [Noise Gate](https://www.audacityteam.org/manual/effects/noise-removal-and-repair/noise-gate) attenuates audio below a threshold. It cannot remove the background while speech holds the gate open. A threshold that is too high can attenuate or cut off quiet syllables, and drastic reduction can make the room sound jump unnaturally in and out. Use it only when that tradeoff is acceptable.

**Room echo or background talking:** these change with time and can overlap the voice you want. The steady-noise effect cannot reliably untangle them. Try a better source recording, a separate microphone track, or evaluate a speech-enhancement tool on a permitted sample. For your own scripted narration, re-recording a sentence can be simpler than repeated restoration. [Text-to-speech options](/blog/best-free-text-to-speech-tools-2026) are a different production route, not a way to “repair” a real interview without changing its authenticity.

**Clipping:** [Clip Fix](https://www.audacityteam.org/manual/effects/noise-removal-and-repair/clip-fix) attempts to reconstruct plausible peaks in lightly clipped audio. It does not recover the exact signal that was never recorded, and severe distortion may still need a new take. Increasing Noise reduction is not an alternative to clipping repair.

## Audacity or Adobe Podcast Enhance Speech

If local control and avoiding an audio upload matter, Audacity's built-in Noise Reduction is a sensible starting point. It needs a useful profile and your listening judgment. Its local workflow does not require a service account, and **Save to computer** is separate from the optional audio.com cloud-saving feature. This is not a claim that the application has no network-capable features.

[Adobe Podcast Enhance Speech](https://podcast.adobe.com/en/enhance) is an online speech-enhancement alternative that requires an account and uploading the file. Its [free-plan limits](https://podcast.adobe.com/en/plans), checked October 1, 2026, are audio-only processing, one file at a time, up to **30 minutes and 500 MB per file**, and **one hour per day**. Free users do not get an enhancement-strength adjustment. Do not confuse those limits with Adobe's separate Studio project-download limits or paid video features.

If the free Adobe result changes the voice too much, a strength slider described in a paid-plan tutorial may not be available to you. Compare a short permitted sample with the original before processing a longer file. Keep client, meeting and sensitive recordings local unless you have permission for the service and have reviewed its current data terms.

Neither option wins every recording, and this guide has not run a comparative listening test. Choose based on the actual noise, the control you need and where the audio is allowed to be processed. The broader [YouTube creator toolkit](/blog/best-ai-tools-for-youtube-creators-2026) explains where cleanup fits alongside scripting, footage and captions.

![A person monitoring a microphone recording through headphones at a computer](https://images.pexels.com/photos/4476163/pexels-photo-4476163.jpeg?auto=compress&cs=tinysrgb&w=1400 "Judge a short voice sample before processing a long recording or uploading it to an online enhancement service")

## Make the Next Recording Easier to Clean

Record a short test before the full session. Listen through headphones for fans, computer noise, desk vibration, room reflections and microphone handling. Move the microphone closer where appropriate, keep it slightly off the direct breath path, and test the result rather than trusting distance alone. Avoid blowing air directly into it.

Choose a quieter time or room when possible. Reduce unnecessary background appliances safely, move the microphone away from the computer, and avoid reflective corners if they make the voice sound hollow. Soft furnishings can help with reflections, but a curtain or bookshelf is not proof of soundproofing and cannot block every external noise source.

Audacity's [first-recording guide](https://www.audacityteam.org/manual/getting-started/make-your-first-recording) recommends testing levels and leaving room below clipping. Speak at the loudest level you expect during the real take, not just a quiet “testing.” Capture a few seconds of room tone with the same microphone and settings, then check the first recording before continuing.

You do not need to buy a complete studio to do this. A consistent recording routine can prevent problems that software would later struggle with. If you are starting a channel, fold that check into the repeatable workflow in our [YouTube channel starter guide](/blog/how-to-start-youtube-channel-2026), rather than spending the whole session chasing perfect silence.

![A home recording workspace with monitors, speakers, books and guitars](https://images.pexels.com/photos/30663802/pexels-photo-30663802.jpeg?auto=compress&cs=tinysrgb&w=1400 "Control noise and reflections where practical; a studio photograph does not demonstrate measured acoustic performance")

## Frequently Asked Questions

### What are the best Audacity noise reduction settings for voice?

There is no universal best combination. Audacity 4 documents defaults of 6 dB reduction, sensitivity 6 and smoothing 6 bands. Test a short passage, inspect Noise only, undo that diagnostic output, and reduce the treatment if it removes wanted speech.

### What is the difference between Reduce and Residue?

Those are older Audacity labels: Reduce produces the cleaned audio, while Residue lets you hear material being removed. Audacity 4 calls the outputs Audio with noise removed and Noise only. Always switch back to the cleaned-audio option for the final treatment.

### Can I use Noise Reduction without a noise profile?

This built-in effect uses a profile captured from representative noise alone. Do not substitute speech or manufactured silence. Look for an appropriate pause in the recording; if none exists, consider another method or a new take with room tone recorded first.

### Why is Noise Reduction greyed out or not working?

Stop playback or recording, select actual audio on the intended track, and check that you have captured a profile before the filtering step. The current effect does not automatically operate on the whole project when nothing is selected. Verify that you are not still processing only the small profile sample.

### Why does my voice sound muffled or underwater afterward?

The profile may include wanted speech, or the settings may remove too much of it. Return to the untreated recording, choose a cleaner profile, and test gentler reduction or sensitivity. Do not stack stronger passes on a damaged result.

### Can Audacity remove fan noise, echo and background voices?

Steady fan noise is a suitable case to test with profile-based reduction. Room echo and changing or overlapping voices are different problems and may not separate cleanly. A quieter recording, separate voice track or another restoration approach may be necessary.

### Is Audacity noise removal free and available on a phone?

The built-in desktop effect is free and can process local audio without an online upload. Audacity's official FAQ lists Windows, macOS and Linux, not an official Android or iPhone app. Similarly named mobile apps are not automatically the official product.

### Is Adobe Podcast Enhance Speech completely free?

It has a limited free tier, not unlimited processing. The current allowance is audio only, one file at a time, up to 30 minutes and 500 MB per file, and one hour per day. An account and upload are required; strength adjustment is not included in the free tier.

## The Practical Goal: Clear Words, Not Perfect Silence

Use a representative noise profile, compare a short untreated and processed passage, and protect the quietest parts of the voice. Keep the original, undo diagnostic output, and verify the actual exported file. If modest cleanup makes the recording easier to understand, stop there rather than processing until the voice sounds artificial.

## Sources and Image Credits

Keyword and topic research began September 30, 2026; core product instructions and plan limits were rechecked October 1, 2026. Primary references include the [Audacity 4 Noise Reduction manual](https://www.audacityteam.org/manual/effects/noise-removal-and-repair/noise-reduction), [legacy 3.x reference](https://manual.audacityteam.org/man/noise_reduction.html), [3-to-4 transition guide](https://www.audacityteam.org/manual/new-in-audacity-4/audacity-3-to-4-transition-guide), [local and cloud project saving](https://www.audacityteam.org/manual/getting-started/save-your-project), [export instructions](https://www.audacityteam.org/manual/getting-started/export-your-audio), [Audacity FAQ](https://www.audacityteam.org/FAQ), and [Adobe Podcast plans](https://podcast.adobe.com/en/plans). Interfaces and service limits can change.

The photographs are illustrative recording and editing scenes, not current Audacity screenshots, product-test evidence or endorsements. Credits: [Ahimsa - OM — cover](https://www.pexels.com/photo/home-studio-for-podcasts-large-black-microphone-notebook-and-notebooks-on-table-close-up-cinematic-style-19537510/), [Jerson Vargas — waveforms](https://www.pexels.com/photo/close-up-of-sound-waves-on-a-computer-screen-4765390/), [Layla Yehia — headphones](https://www.pexels.com/photo/black-headphones-on-macbook-pro-3846434/), [Karola G — microphone recording](https://www.pexels.com/photo/person-using-microphone-4476163/), and [Dominik Gryzbon — home studio](https://www.pexels.com/photo/cozy-home-music-studio-with-guitars-and-equipment-30663802/), used under the [Pexels license](https://www.pexels.com/license/).