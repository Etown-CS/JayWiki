// frontend/src/app/features/my-projects/project-form-modal.ts
// Standalone create/edit modal for projects.
// Parent (MyProjects) owns all state and API calls.
// This component owns only local input field values (topicInput, collaboratorEmail)
// and emits events upward for every user action.

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectForm, UserCourse } from './my-projects';

export interface ExistingTopic       { topicId: number; name: string; }
export interface ExistingCollaborator { userId: number; name: string; }

@Component({
  selector: 'app-project-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-form-modal.html',
})
export class ProjectFormModal {
  // ── Inputs ──────────────────────────────────────────────────────────────────
  @Input() open          = false;
  @Input() isEditMode    = false;
  @Input() form!         : ProjectForm;
  @Input() courses       : UserCourse[]              = [];
  @Input() existingTopics: ExistingTopic[]           = [];
  @Input() pendingTopics : string[]                  = [];
  @Input() existingCollaborators: ExistingCollaborator[] = [];
  @Input() saving              = false;
  @Input() saveError           = '';
  @Input() collaboratorError   = '';
  @Input() collaboratorAdding  = false;

  // ── Outputs ─────────────────────────────────────────────────────────────────
  @Output() closed                 = new EventEmitter<void>();
  @Output() saved                  = new EventEmitter<void>();
  @Output() existingTopicRemoved   = new EventEmitter<number>();   // topicId
  @Output() pendingTopicAdded      = new EventEmitter<string>();   // name
  @Output() pendingTopicRemoved    = new EventEmitter<string>();   // name
  @Output() collaboratorAdded      = new EventEmitter<string>();   // email
  @Output() collaboratorRemoved    = new EventEmitter<number>();   // userId

  // ── Local input state (owned by this component) ──────────────────────────────
  topicInput        = '';
  collaboratorEmail = '';

  // ── Topic helpers ─────────────────────────────────────────────────────────────
  submitTopic(): void {
    const name = this.topicInput.trim();
    if (!name) return;
    const duplicate =
      this.pendingTopics.some(t => t.toLowerCase() === name.toLowerCase()) ||
      this.existingTopics.some(t => t.name.toLowerCase() === name.toLowerCase());
    if (!duplicate) this.pendingTopicAdded.emit(name);
    this.topicInput = '';
  }

  onTopicKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.submitTopic(); }
  }

  // ── Collaborator helpers ─────────────────────────────────────────────────────
  submitCollaborator(): void {
    const email = this.collaboratorEmail.trim().toLowerCase();
    if (!email) return;
    this.collaboratorAdded.emit(email);
    this.collaboratorEmail = '';
  }

  // ── Display helpers ──────────────────────────────────────────────────────────
  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  getTopicClass(i: number): string {
    const classes = [
      'bg-[#4A90C4]/10 text-[#4A90C4] border-[#4A90C4]/20',
      'bg-[#C8102E]/10 text-[#FF6B6B] border-[#C8102E]/20',
      'bg-[#2ECC71]/10 text-[#2ECC71] border-[#2ECC71]/20',
      'bg-[#F0C040]/10 text-[#F0C040] border-[#F0C040]/20',
    ];
    return classes[i % classes.length];
  }
}
