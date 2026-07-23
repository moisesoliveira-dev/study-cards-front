import { subjectsApi } from '../api/subjects.api';
import type {
  CreateSubjectInput,
  Subject,
  UpdateSubjectInput,
} from '../types/subject.types';

/** Facade: ponto único de acesso às operações de matérias. */
export class SubjectsFacade {
  list(): Promise<Subject[]> {
    return subjectsApi.list();
  }

  get(id: string): Promise<Subject> {
    return subjectsApi.get(id);
  }

  create(input: CreateSubjectInput): Promise<Subject> {
    return subjectsApi.create({
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      color: input.color,
    });
  }

  update(id: string, input: UpdateSubjectInput): Promise<Subject> {
    return subjectsApi.update(id, {
      ...input,
      name: input.name?.trim(),
      description: input.description?.trim() || undefined,
    });
  }

  remove(id: string): Promise<{ ok: boolean }> {
    return subjectsApi.remove(id);
  }
}

export const subjectsFacade = new SubjectsFacade();
